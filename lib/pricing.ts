import { round2 } from "./format";

/**
 * Pricing a tally for resale (BUILD.MD §5.7, §7). The discount is clamped to
 * 2%–35% server-side no matter what the model says, and when Anthropic is not
 * configured the same arithmetic runs locally so the flow never dead-ends.
 */

export const MIN_DISCOUNT = 2;
export const MAX_DISCOUNT = 35;

export type PricingInput = {
  faceValue: number;
  currency: string;
  debtorName: string;
  score: number;
  settledCount: number;
  avgDays: number | null;
  overdueCount: number;
};

export type Pricing = {
  price: number;
  discountPct: number;
  rationale: string;
  source: "ai" | "local";
};

export function clampDiscount(pct: number): number {
  if (!Number.isFinite(pct)) return MIN_DISCOUNT;
  return Math.min(MAX_DISCOUNT, Math.max(MIN_DISCOUNT, Math.round(pct * 10) / 10));
}

export function priceFromDiscount(faceValue: number, discountPct: number): number {
  return round2(faceValue * (1 - clampDiscount(discountPct) / 100));
}

/**
 * The local model: start from the Tally Score, then let the concrete facts —
 * how long they take, how many tallies they have let age — move it.
 */
export function localPricing(input: PricingInput): Pricing {
  let discount = 20 - (input.score - 50) * 0.28;

  if (input.avgDays !== null) {
    if (input.avgDays <= 7) discount -= 4;
    else if (input.avgDays > 21) discount += 5;
  }
  discount += input.overdueCount * 3;
  if (input.settledCount === 0) discount += 4;

  const discountPct = clampDiscount(discount);

  return {
    discountPct,
    price: priceFromDiscount(input.faceValue, discountPct),
    rationale: localRationale(input, discountPct),
    source: "local",
  };
}

function localRationale(input: PricingInput, discountPct: number): string {
  const name = input.debtorName;

  if (input.settledCount === 0) {
    return `${name} has not settled anything yet, so ${discountPct}% covers the unknown.`;
  }
  if (input.overdueCount > 0) {
    return `${name} has ${input.overdueCount} ${
      input.overdueCount === 1 ? "tally" : "tallies"
    } open past a month, which is what puts this at ${discountPct}%.`;
  }
  if (input.avgDays !== null && input.avgDays <= 7) {
    return `${name} settles in about ${Math.round(input.avgDays)} days, so ${discountPct}% is enough.`;
  }
  return `${name} settles in about ${Math.round(input.avgDays ?? 14)} days — ${discountPct}% is fair.`;
}

/**
 * Used by the voice tool, which needs a price to speak immediately. The route
 * at /api/price-listing is the one that actually calls Anthropic; this keeps
 * the spoken path fast and always available.
 */
export function priceFromStats(input: PricingInput): Pricing {
  return localPricing(input);
}
