export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

const K2_ENDPOINT =
  process.env.K2_ENDPOINT || "https://api.k2think.ai/v1/chat/completions";
const K2_MODEL = process.env.K2_MODEL || "MBZUAI-IFM/K2-Think-v2";
const K2_API_KEY = process.env.K2_API_KEY || "";

const BILL_ANALYSIS_PROMPT = `You are WattsUp AI. Extract and summarize an electricity bill. Be concise — no fluff, no reasoning, no preamble.

Reply in EXACTLY this format (fill in the brackets):

**Period:** [billing period]
**Provider:** [provider name]
**Total Due:** $[amount]
**Usage:** [kWh] kWh ([high/average/low] for Illinois)
**Your Rate:** [X] ¢/kWh ([above/below/near] ComEd avg of ~8 ¢/kWh)

**Top Savings Tips:**
1. [specific tip] — save ~$[amount]/mo
2. [specific tip] — save ~$[amount]/mo

**Verdict:** [one sentence — are they overpaying, doing fine, etc.]

If you cannot extract a field from the bill text, write "not found". Never make up numbers.`;

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
        stream: true,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `K2 API error: ${res.status} ${errText}` },
        { status: 502 },
      );
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const readable = new ReadableStream({
      async start(controller) {
        const reader = res.body!.getReader();
        let insideThink = false;
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const token: string = parsed.choices?.[0]?.delta?.content ?? "";
              if (!token) continue;

              buffer += token;

              while (true) {
                if (insideThink) {
                  const closeIdx = buffer.indexOf("</think>");
                  if (closeIdx === -1) {
                    buffer = "";
                    break;
                  }
                  buffer = buffer.slice(closeIdx + 8);
                  insideThink = false;
                } else {
                  const openIdx = buffer.indexOf("<think>");
                  if (openIdx === -1) {
                    const safe = buffer.length > 7 ? buffer.slice(0, -7) : "";
                    if (safe) {
                      controller.enqueue(encoder.encode(safe));
                      buffer = buffer.slice(safe.length);
                    }
                    break;
                  }
                  const before = buffer.slice(0, openIdx);
                  if (before) controller.enqueue(encoder.encode(before));
                  buffer = buffer.slice(openIdx + 7);
                  insideThink = true;
                }
              }
            } catch {
              // skip malformed SSE chunks
            }
          }
        }

        if (!insideThink && buffer) {
          controller.enqueue(encoder.encode(buffer));
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
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
