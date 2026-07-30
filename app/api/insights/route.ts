import { NextResponse } from "next/server";
import { anthropic, hasAnthropic, MODEL, parseJson, textOf } from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";

/**
 * The three monthly observations rendered as an editorial pull-quote and
 * labelled "Read by AI" (BUILD.MD §5.6, §7).
 */

const PROMPT =
  "Write exactly 3 one-sentence observations about this person's month, specific and numeric, " +
  'no advice-column tone. ONLY JSON: {"insights":[s1,s2,s3]}.';

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Log in again." }, { status: 401 });

  let body: {
    month?: string;
    currency?: string;
    income?: number;
    spend?: number;
    by_category?: Record<string, number>;
    budgets?: Record<string, number>;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Nothing to read." }, { status: 400 });
  }

  if (!hasAnthropic()) {
    return NextResponse.json({ insights: [], reason: "not_configured" });
  }

  const categories = Object.entries(body.by_category ?? {})
    .sort((a, b) => b[1] - a[1])
    .map(([name, total]) => {
      const budget = body.budgets?.[name];
      return `${name}: ${total}${budget ? ` (budget ${budget})` : ""}`;
    })
    .join("\n");

  try {
    const message = await anthropic().messages.create({
      model: MODEL,
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `${PROMPT}

Month: ${body.month ?? "this month"}
Currency: ${body.currency ?? "USD"}
Money in: ${body.income ?? 0}
Money out: ${body.spend ?? 0}
By category:
${categories || "nothing recorded"}`,
        },
      ],
    });

    const parsed = parseJson<{ insights?: unknown }>(textOf(message));
    const insights = Array.isArray(parsed?.insights)
      ? parsed.insights.map((i) => String(i)).filter(Boolean).slice(0, 3)
      : [];

    return NextResponse.json({ insights });
  } catch {
    return NextResponse.json({ insights: [], reason: "unavailable" });
  }
}
