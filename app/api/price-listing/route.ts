import { NextResponse } from "next/server";
import { anthropic, hasAnthropic, MODEL, parseJson, textOf } from "@/lib/anthropic";
import { clampDiscount, localPricing, priceFromDiscount, type Pricing } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";

/**
 * AI pricing for a tally on the Exchange (BUILD.MD §5.7, §7). The 2%–35% clamp
 * is applied server-side regardless of what comes back, and if the model is
 * unavailable the local model in lib/pricing.ts answers instead — the seller
 * always gets a price and a sentence.
 */

const PROMPT =
  "You price a small personal IOU for resale between friends. Given the debtor's repayment stats, " +
  "propose a fair discounted price. Discount must be between 2% and 35%. " +
  'ONLY JSON: {"suggested_price":number,"discount_pct":number,"rationale":"one plain sentence citing the stats"}. ' +
  // The model reaches for an em dash unprompted, and the product does not use
  // one anywhere. A rationale is shown on a card beside hand-drawn strokes, so
  // a stray typographic tic from the model is visible as a seam.
  'Never use an em dash or an en dash in the rationale. Use a comma or a colon.';

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Log in again." }, { status: 401 });

  let body: {
    face_value?: number;
    currency?: string;
    debtor_name?: string;
    settled_count?: number;
    avg_days_to_settle?: number | null;
    open_amount?: number;
    overdue_count?: number;
    tally_score?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Nothing to price." }, { status: 400 });
  }

  const faceValue = Number(body.face_value);
  if (!Number.isFinite(faceValue) || faceValue <= 0) {
    return NextResponse.json({ error: "That tally has no value to sell." }, { status: 400 });
  }

  const input = {
    faceValue,
    currency: String(body.currency ?? "USD"),
    debtorName: String(body.debtor_name ?? "They"),
    score: Number(body.tally_score ?? 50),
    settledCount: Number(body.settled_count ?? 0),
    avgDays: body.avg_days_to_settle === null ? null : Number(body.avg_days_to_settle),
    overdueCount: Number(body.overdue_count ?? 0),
  };

  if (!hasAnthropic()) {
    return NextResponse.json(toResponse(localPricing(input)));
  }

  try {
    const message = await anthropic().messages.create({
      model: MODEL,
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: `${PROMPT}

Debtor: ${input.debtorName}
Face value: ${faceValue} ${input.currency}
Tally score (0-100): ${input.score}
Tallies settled: ${input.settledCount}
Average days to settle: ${input.avgDays === null ? "no history" : Math.round(input.avgDays)}
Amount still open: ${body.open_amount ?? 0}
Tallies open past a month: ${input.overdueCount}`,
        },
      ],
    });

    const parsed = parseJson<{
      suggested_price?: number;
      discount_pct?: number;
      rationale?: string;
    }>(textOf(message));

    if (!parsed) return NextResponse.json(toResponse(localPricing(input)));

    // The clamp is ours, not the model's.
    const discountPct = clampDiscount(Number(parsed.discount_pct));

    return NextResponse.json(
      toResponse({
        discountPct,
        price: priceFromDiscount(faceValue, discountPct),
        rationale:
          typeof parsed.rationale === "string" && parsed.rationale.trim()
            ? withoutDashes(parsed.rationale.trim())
            : localPricing(input).rationale,
        source: "ai",
      }),
    );
  } catch {
    return NextResponse.json(toResponse(localPricing(input)));
  }
}

function toResponse(pricing: Pricing) {
  return {
    suggested_price: pricing.price,
    discount_pct: pricing.discountPct,
    rationale: pricing.rationale,
    source: pricing.source,
  };
}

/**
 * The house style has no dashes in it, and asking the model nicely is not the
 * same as enforcing it. A rationale is rendered beside hand-drawn strokes, so
 * one stray em dash reads as a seam between what was written and what was
 * generated.
 */
function withoutDashes(text: string): string {
  return text
    .replace(/\s+[—–]\s+/g, ": ")
    .replace(/[—–]/g, ", ")
    .replace(/:\s+(and|but|so|or|then)\b/g, ", $1");
}
