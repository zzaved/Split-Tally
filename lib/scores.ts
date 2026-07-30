import type { LedgerRows } from "./ledger";
import { scoreStatsFor, type ScoreStats } from "./ledger";
import { tallyScore } from "./score";

export type PersonScore = { score: number; stats: ScoreStats };

/**
 * Scores are computed from the history the viewer can actually see, and fall
 * back to the cached `profiles.tally_score` for people whose history is
 * invisible to them — a debtor in a group they are not part of, for instance.
 *
 * Computing on read rather than trusting the column matters because RLS stops
 * one user from writing another user's profile: Ana can recompute her managed
 * friend Paulo, but never Marina.
 */
export function computeScores(
  rows: LedgerRows,
  personIds: string[],
  fallback: Map<string, number>,
  now: Date = new Date(),
): Map<string, PersonScore> {
  const out = new Map<string, PersonScore>();

  for (const id of personIds) {
    const stats = scoreStatsFor(id, rows, now);
    const hasHistory = stats.settledCount > 0 || stats.openAmount > 0;

    out.set(id, {
      score: hasHistory ? tallyScore(stats) : (fallback.get(id) ?? 50),
      stats,
    });
  }

  return out;
}
