/**
 * Tally Score (BUILD.MD §5.7) — deliberately transparent, because the whole
 * point of showing it next to a listing is that a buyer can reason about it.
 *
 *   start at 50
 *   +2 per settled debt, capped at +30
 *   average days to settle ≤ 7  → +15
 *                          ≤ 14 → +8
 *   −5 per debt left open more than 30 days, capped at −25
 *   clamped to 0–100
 *
 * "Days to settle" for one payment is the gap between the payment and the most
 * recent expense in that group that the payer had a share in and that predates
 * the payment. It is the plainest reading of "how long did they take".
 */

export const SCORE_START = 50;
export const SETTLED_BONUS = 2;
export const SETTLED_BONUS_CAP = 30;
export const FAST_DAYS = 7;
export const FAST_BONUS = 15;
export const OK_DAYS = 14;
export const OK_BONUS = 8;
export const OVERDUE_DAYS = 30;
export const OVERDUE_PENALTY = 5;
export const OVERDUE_PENALTY_CAP = 25;

export type ScoreInput = {
  /** How many payments this person has made. */
  settledCount: number;
  /** Mean days to settle across those payments; null when they have none. */
  avgDaysToSettle: number | null;
  /** Counterparties they still owe, where the debt is older than 30 days. */
  overdueCount: number;
};

export type ScoreLine = { label: string; delta: number };

export function scoreBreakdown(input: ScoreInput): ScoreLine[] {
  const lines: ScoreLine[] = [{ label: "Everyone starts here", delta: SCORE_START }];

  const settled = Math.min(input.settledCount * SETTLED_BONUS, SETTLED_BONUS_CAP);
  if (settled > 0) {
    lines.push({
      label: `${input.settledCount} ${input.settledCount === 1 ? "tally" : "tallies"} settled`,
      delta: settled,
    });
  }

  if (input.avgDaysToSettle !== null) {
    if (input.avgDaysToSettle <= FAST_DAYS) {
      lines.push({
        label: `Settles in about ${Math.round(input.avgDaysToSettle)} days`,
        delta: FAST_BONUS,
      });
    } else if (input.avgDaysToSettle <= OK_DAYS) {
      lines.push({
        label: `Settles in about ${Math.round(input.avgDaysToSettle)} days`,
        delta: OK_BONUS,
      });
    }
  }

  const penalty = Math.min(input.overdueCount * OVERDUE_PENALTY, OVERDUE_PENALTY_CAP);
  if (penalty > 0) {
    lines.push({
      label: `${input.overdueCount} ${input.overdueCount === 1 ? "tally" : "tallies"} open past a month`,
      delta: -penalty,
    });
  }

  return lines;
}

export function tallyScore(input: ScoreInput): number {
  const total = scoreBreakdown(input).reduce((sum, line) => sum + line.delta, 0);
  return Math.max(0, Math.min(100, Math.round(total)));
}

/** One plain sentence, used by listing cards and by the agent when it speaks. */
export function describeScore(score: number, input?: ScoreInput): string {
  if (input && input.settledCount === 0) return "No repayment history yet.";
  if (score >= 85) return "Settles quickly and has never let a tally age.";
  if (score >= 70) return "Reliable, usually settles within a fortnight.";
  if (score >= 50) return "Mixed record: settles, but takes their time.";
  return "Slow to settle, with tallies left open past a month.";
}

// ---------------------------------------------------------------------------
// Reading the score
//
// A number on its own is not a judgement, and the most dangerous thing this
// score can do is look like a measurement when it is really a default. Someone
// brand new scores 50 and someone with a genuinely middling record scores 50,
// and those two 50s mean completely different things to anyone deciding
// whether to lend or to buy. `unproven` exists so the interface can never
// present the first as though it were the second.
// ---------------------------------------------------------------------------

export type ScoreBand = "unproven" | "weak" | "mixed" | "steady" | "strong";

/** How much history is behind the number at all. */
export function scoreConfidence(input: ScoreInput): "none" | "thin" | "fair" | "good" {
  if (input.settledCount === 0) return "none";
  if (input.settledCount < 3) return "thin";
  if (input.settledCount < 8) return "fair";
  return "good";
}

export function scoreBand(score: number, input?: ScoreInput): ScoreBand {
  if (input && input.settledCount === 0) return "unproven";
  if (score >= 85) return "strong";
  if (score >= 70) return "steady";
  if (score >= 50) return "mixed";
  return "weak";
}

export const BAND_LABEL: Record<ScoreBand, string> = {
  unproven: "No record yet",
  weak: "Slow payer",
  mixed: "Mixed record",
  steady: "Reliable",
  strong: "Settles fast",
};

// ---------------------------------------------------------------------------
// "I'm improving"
//
// A low score with no explanation tells a lender one thing; a low score held by
// someone who was reliable for a long stretch tells them something else. This
// flag lets the second person say so.
//
// The declaration itself is cheap talk, so it is not what carries the weight.
// The weight is in the eligibility rule: you can only say it if the record
// already shows you reaching HIGH_MARK at some point, which the ledger proves
// on its own. Somebody who has never been reliable simply cannot make the
// claim, and a new account cannot make it at all.
//
// Spending the credit is permanent until the record earns it back. Reaching
// HIGH_MARK again after the last use, which means actually paying people, is
// the only thing that returns it. It is a second chance you have to pay for
// twice.
// ---------------------------------------------------------------------------

/** The score a record must have reached for the claim to be available. */
export const HIGH_MARK = 80;
/** Below this, a score is low enough that the claim means something. */
export const LOW_MARK = 50;
/** At or above this, the person has recovered and the flag retires itself. */
export const RECOVERED_MARK = 70;

export type ImprovingState =
  /** Never been reliable, so there is nothing to claim. */
  | { status: "unavailable"; reason: "never-high" }
  /** Score is not low; the claim would say nothing. */
  | { status: "unavailable"; reason: "not-low" }
  /** Used it, and has not earned it back yet. */
  | { status: "unavailable"; reason: "spent"; usedAt: string }
  /** Eligible right now. */
  | { status: "available"; peak: number; peakOn: string | null }
  /** Declared and standing. */
  | { status: "active"; since: string; peak: number; peakOn: string | null };

export function improvingState(input: {
  score: number;
  peak: number;
  peakOn: string | null;
  /** The highest the record reached after the credit was last spent. */
  peakSinceUsed: number | null;
  improvingSince: string | null;
  improvingUsedAt: string | null;
}): ImprovingState {
  const { score, peak, peakOn, improvingSince, improvingUsedAt } = input;

  if (improvingSince) {
    // Recovering retires the flag on its own: the number now speaks for itself.
    if (score >= RECOVERED_MARK) return { status: "unavailable", reason: "not-low" };
    return { status: "active", since: improvingSince, peak, peakOn };
  }

  if (peak < HIGH_MARK) return { status: "unavailable", reason: "never-high" };
  if (score >= LOW_MARK) return { status: "unavailable", reason: "not-low" };

  if (improvingUsedAt) {
    const earnedBack = (input.peakSinceUsed ?? 0) >= HIGH_MARK;
    if (!earnedBack) return { status: "unavailable", reason: "spent", usedAt: improvingUsedAt };
  }

  return { status: "available", peak, peakOn };
}

/**
 * What to tell a buyer or a lender when someone carries the flag. Deliberately
 * states the fact that can be checked, never the intention that cannot.
 */
export function improvingNote(name: string, peak: number): string {
  return `${name} reached ${peak} at their best and has since fallen. They have acknowledged it and are working it back up.`;
}

export type RiskNote = { band: ScoreBand; headline: string; detail: string };

/**
 * What the score means when you are about to be owed money by this person.
 * Returns null when there is nothing worth interrupting anyone over — a good
 * record should be quiet, not congratulated.
 */
export function lendingRisk(name: string, score: number, input: ScoreInput): RiskNote | null {
  const band = scoreBand(score, input);
  const confidence = scoreConfidence(input);

  if (band === "unproven") {
    return {
      band,
      headline: `${name} has no repayment record yet.`,
      detail:
        "That is not a red flag, it is an absence of information. Their score is the number everyone starts on, not something measured.",
    };
  }

  if (band === "weak") {
    const overdue = input.overdueCount;
    return {
      band,
      headline: `${name} has a habit of paying late.`,
      detail:
        overdue > 0
          ? `${overdue} of their ${overdue === 1 ? "tally is" : "tallies are"} already more than a month old${
              input.avgDaysToSettle !== null
                ? `, and they take about ${Math.round(input.avgDaysToSettle)} days to settle`
                : ""
            }.`
          : `They take about ${Math.round(input.avgDaysToSettle ?? 30)} days to settle.`,
    };
  }

  if (band === "mixed" && confidence !== "none") {
    return {
      band,
      headline: `${name} settles, but not quickly.`,
      detail: `About ${Math.round(input.avgDaysToSettle ?? 20)} days on average, across ${input.settledCount} ${
        input.settledCount === 1 ? "tally" : "tallies"
      }.`,
    };
  }

  return null;
}

/**
 * What the score means when you are about to buy this debt.
 *
 * The discount is the compensation for the risk, so the useful question is not
 * "is this person good" but "is this discount enough for this person". That is
 * answerable: compare what is being asked against what their own record would
 * price it at.
 */
export function buyingRisk(
  name: string,
  score: number,
  input: ScoreInput,
  offeredDiscountPct: number,
  fairDiscountPct: number,
): RiskNote {
  const band = scoreBand(score, input);
  const thin = scoreConfidence(input) === "none" || scoreConfidence(input) === "thin";
  const gap = offeredDiscountPct - fairDiscountPct;

  if (band === "unproven") {
    return {
      band,
      headline: `Nothing is known about how ${name} pays.`,
      detail: `Their score is the starting 50, not a measurement. At ${offeredDiscountPct}% off you are being paid for an unknown, not for a record.`,
    };
  }

  if (gap < -3) {
    return {
      band,
      headline: `Priced tighter than ${name}'s record justifies.`,
      detail: `${offeredDiscountPct}% off, where their history prices closer to ${Math.round(fairDiscountPct)}%. You are taking on the wait for less than it is worth.`,
    };
  }

  if (band === "weak") {
    return {
      band,
      headline: `${name} is a slow payer, and the discount reflects it.`,
      detail: `${input.overdueCount > 0 ? `${input.overdueCount} of their tallies sit past a month. ` : ""}At ${offeredDiscountPct}% you are being paid to wait, and to carry the chance they keep waiting.`,
    };
  }

  if (thin) {
    return {
      band,
      headline: `${name}'s record is short.`,
      detail: `Only ${input.settledCount} settled ${input.settledCount === 1 ? "tally" : "tallies"} behind that score, so read it lightly.`,
    };
  }

  return {
    band,
    headline: `${name} has settled ${input.settledCount} tallies${
      input.avgDaysToSettle !== null ? ` in about ${Math.round(input.avgDaysToSettle)} days each` : ""
    }.`,
    detail: `At ${offeredDiscountPct}% off you are paid ${gap > 3 ? "more than" : "about"} what the wait is worth on that record.`,
  };
}

export type ScoreTip = { action: string; gain: number; why: string };

/**
 * How to move the number, worked out from this person's own arithmetic rather
 * than offered as advice. Every gain here is what the formula would actually
 * award, so nothing promises more than it can deliver.
 */
export function improvementTips(input: ScoreInput): ScoreTip[] {
  const now = tallyScore(input);
  const tips: ScoreTip[] = [];

  if (input.overdueCount > 0) {
    const cleared = tallyScore({ ...input, overdueCount: 0 });
    tips.push({
      action:
        input.overdueCount === 1
          ? "Clear the tally that has been open past a month"
          : `Clear the ${input.overdueCount} tallies that have been open past a month`,
      gain: cleared - now,
      why: "Each one sitting past thirty days costs five points, up to twenty five.",
    });
  }

  if (input.avgDaysToSettle !== null && input.avgDaysToSettle > OK_DAYS) {
    tips.push({
      action: "Bring your average down to a fortnight",
      gain: OK_BONUS,
      why: `You are at about ${Math.round(input.avgDaysToSettle)} days. Under fourteen adds eight, under seven adds fifteen.`,
    });
  } else if (
    input.avgDaysToSettle !== null &&
    input.avgDaysToSettle > FAST_DAYS &&
    input.avgDaysToSettle <= OK_DAYS
  ) {
    tips.push({
      action: "Bring your average under a week",
      gain: FAST_BONUS - OK_BONUS,
      why: `You are at about ${Math.round(input.avgDaysToSettle)} days. Under seven is worth another seven points.`,
    });
  }

  const settledRoom = SETTLED_BONUS_CAP - Math.min(input.settledCount * SETTLED_BONUS, SETTLED_BONUS_CAP);
  if (settledRoom > 0) {
    tips.push({
      action:
        input.settledCount === 0
          ? "Settle your first tally"
          : "Keep settling; each one still counts",
      gain: Math.min(SETTLED_BONUS, settledRoom),
      why: `Two points per tally settled, up to thirty. You have banked ${Math.min(
        input.settledCount * SETTLED_BONUS,
        SETTLED_BONUS_CAP,
      )} of them.`,
    });
  }

  return tips.filter((t) => t.gain > 0);
}

/** Five clusters of 20 points each, drawn as tally marks. */
export function scoreClusters(score: number): { filled: number; total: number } {
  return { filled: Math.round((Math.max(0, Math.min(100, score)) / 100) * 25), total: 25 };
}
