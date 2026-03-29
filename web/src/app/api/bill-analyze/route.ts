export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { formatChatPlainText } from "@/lib/format-chat-plain";
import { getDb } from "@/lib/mongodb";

const K2_ENDPOINT =
  process.env.K2_ENDPOINT || "https://api.k2think.ai/v1/chat/completions";
const K2_MODEL = process.env.K2_MODEL || "MBZUAI-IFM/K2-Think-v2";
const K2_API_KEY = process.env.K2_API_KEY || "";

const BILL_ANALYSIS_PROMPT = `You are WattsUp AI, a quick energy bill advisor. Summarize an electricity bill in 2-4 short paragraphs of plain text.

Include the key numbers: billing period, provider, total due, kWh used, effective rate per kWh. Compare their rate to the ComEd average of about 8 cents/kWh. Give 1-2 specific savings tips with estimated dollar savings derived from their actual usage and rate. End with a one-sentence verdict on whether they are overpaying.

Keep it concise and conversational. Use plain language — no jargon. Do not use Markdown: no ** or # for emphasis/headings, no [text](url) links, no backticks. For lists use "1) " and "2) " format. Round numbers to 1 decimal place. If you cannot find a number in the bill, say "not found" — never make up numbers.`;

async function extractBillText(req: NextRequest): Promise<{ billText: string; userId: string } | NextResponse> {
  const ct = req.headers.get("content-type") || "";

  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();
    const userId = String(form.get("userId") || "demo-user");
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    const name = file.name.toLowerCase();
    const mime = file.type;

    if (mime === "text/plain" || name.endsWith(".txt")) {
      const billText = (await file.text()).trim();
      if (billText.length < 30) {
        return NextResponse.json(
          { error: "Not enough text in file" },
          { status: 400 },
        );
      }
      return { billText, userId };
    }

    if (mime === "application/pdf" || name.endsWith(".pdf")) {
      try {
        const buf = Buffer.from(await file.arrayBuffer());
        const pdfParseMod = await import("pdf-parse");
        const pdfParse = pdfParseMod.default ?? pdfParseMod;
        const data = await pdfParse(buf);
        const billText = String(data?.text ?? "").trim();
        if (billText.length < 50) {
          return NextResponse.json(
            {
              error:
                "Could not extract enough text from this PDF. Paste bill text below instead.",
            },
            { status: 400 },
          );
        }
        return { billText, userId };
      } catch (e) {
        console.error("bill-analyze PDF extract", e);
        return NextResponse.json(
          {
            error:
              "PDF extraction failed on the server. Try pasting bill text instead.",
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      { error: "Unsupported file type — use PDF or .txt" },
      { status: 400 },
    );
  }

  let body: { billText: string; userId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { billText, userId = "demo-user" } = body;
  if (!billText?.trim()) {
    return NextResponse.json(
      { error: "No bill text provided" },
      { status: 400 },
    );
  }
  return { billText, userId };
}

async function getGridContext(userId: string): Promise<string> {
  try {
    const db = await getDb();
    const latest = await db
      .collection("energy_logs")
      .find({ user_id: userId })
      .sort({ timestamp: -1 })
      .limit(1)
      .toArray();

    if (!latest.length) return "";

    const doc = latest[0];
    const price = doc.price_data?.current_price ?? null;
    const avg24h = doc.price_data?.avg_24h ?? null;
    const renewablePct = doc.renewable_pct ?? null;

    return `\n\nCURRENT GRID CONTEXT:
- Current ComEd hourly rate: ${price !== null ? price.toFixed(1) + " cents/kWh" : "unavailable"}
- 24h average rate: ${avg24h !== null ? avg24h.toFixed(1) + " cents/kWh" : "unavailable"}
- Current renewable energy: ${renewablePct !== null ? renewablePct.toFixed(1) + "%" : "unavailable"}`;
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
  if (!K2_API_KEY) {
    return NextResponse.json(
      { error: "K2_API_KEY is not configured" },
      { status: 503 },
    );
  }

  const extracted = await extractBillText(req);
  if (extracted instanceof NextResponse) return extracted;

  const { billText, userId } = extracted;
  const gridContext = await getGridContext(userId);

  const messages = [
    {
      role: "system" as const,
      content: BILL_ANALYSIS_PROMPT + gridContext,
    },
    {
      role: "user" as const,
      content: `Here is the extracted text from my electricity bill:\n\n${billText}`,
    },
  ];

  try {
    const res = await fetch(K2_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${K2_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: K2_MODEL,
        messages,
        temperature: 0.3,
        max_tokens: 512,
        stream: false,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `K2 API error: ${res.status} ${errText}` },
        { status: 502 },
      );
    }

    const data = await res.json();
    let content: string =
      data?.choices?.[0]?.message?.content ?? "No response from K2.";

    // Strip <think> reasoning tags — keep only the final answer
    content = content.replace(/<think>[\s\S]*?<\/think>/g, "");
    content = content.replace(/<think>[\s\S]*/g, "");
    content = content.replace(/[\s\S]*<\/think>/g, "");
    content = content.trim();
    content = formatChatPlainText(content);

    return NextResponse.json({ analysis: content, model: K2_MODEL });
  } catch (e) {
    return NextResponse.json(
      { error: `K2 request failed: ${e instanceof Error ? e.message : e}` },
      { status: 502 },
    );
  }
}
