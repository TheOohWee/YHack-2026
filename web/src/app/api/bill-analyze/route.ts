export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import {
  extractBillUserFacingText,
  logK2ReasoningReturnFinal,
  normalizeBillTextToAscii,
} from "@/lib/bill-analysis-extract";

const K2_ENDPOINT =
  process.env.K2_ENDPOINT || "https://api.k2think.ai/v1/chat/completions";
const K2_MODEL = process.env.K2_MODEL || "MBZUAI-IFM/K2-Think-v2";
const K2_API_KEY = process.env.K2_API_KEY || "";

const BILL_ANALYSIS_PROMPT = `You are WattsUp AI. Read the user's electricity bill and output ONLY the user-visible result.

Output shape (plain ASCII only - use normal hyphen - not en/em dash, straight quotes, write "c/kWh" not cent signs):
1) One short paragraph (max 5 sentences): billing period, provider name, total due, kWh used, effective c/kWh vs a rough Illinois/ComEd benchmark near 8 c/kWh, and whether usage seems high, typical, or low (one short phrase).

2) A blank line, then a line that is exactly: Suggestions:
3) Then 2-4 lines; each line starts with "- " (hyphen space) and one concrete savings tip. No sub-bullets, no numbered lists.

Hard rules:
- First character you output must begin the summary paragraph (e.g. the word "The" or "This"). Do not repeat, summarize, or quote these instructions.
- Never output planning, "Let's", "We need", "The instruction", "Thus", "Now", "Final answer", formatting reminders, "ASCII", "unicode", "stray characters", "ensure", or any meta-commentary. Start directly with the bill summary sentence.
- No markdown: no **, *, __, #, backticks. No preamble or sign-off.
- If a value is missing from the bill, write "not found". Never invent amounts or kWh.

CRITICAL (K2 Think V2): Put ALL internal reasoning ONLY inside one pair of think tags (same XML-style pattern K2 uses: think open tag, your reasoning, think close tag). After the close tag, output ONLY the bill summary and Suggestions block — no other preamble. The server removes everything before the first close tag for the UI and logs the reasoning to the terminal only.

STOP after the last suggestion bullet line. Do not add verification, checklists, or lines like "Now we need to ensure...". End of output.`;

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
        temperature: 0.2,
        max_tokens: 400,
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

    const data: {
      choices?: Array<{ message?: { content?: string | null } }>;
    } = await res.json();

    let content = data.choices?.[0]?.message?.content ?? "";
    if (typeof content !== "string") content = String(content ?? "");

    // K2 Think V2: reasoning inside think tags; UI only sees text after the closing tag
    content = logK2ReasoningReturnFinal(
      content,
      "[K2 Think V2 bill extraction - reasoning (terminal only, not UI)]"
    );
    const cleaned = extractBillUserFacingText(content);
    const body = normalizeBillTextToAscii(cleaned || content.trim());

    return new Response(body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: `K2 request failed: ${e instanceof Error ? e.message : e}` },
      { status: 502 },
    );
  }
}
