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
  if (score >= 50) return "Mixed record — settles, but takes their time.";
  return "Slow to settle, with tallies left open past a month.";
}

/** Five clusters of 20 points each, drawn as tally marks. */
export function scoreClusters(score: number): { filled: number; total: number } {
  return { filled: Math.round((Math.max(0, Math.min(100, score)) / 100) * 25), total: 25 };
}
