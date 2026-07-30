import type { Metadata } from "next";
import Link from "next/link";
import { AmountDisplay } from "@/components/ink/AmountDisplay";
import { Avatar, Card, SectionHeading } from "@/components/ink/Card";
import { EmptyState } from "@/components/ink/EmptyState";
import { ScoreDial } from "@/components/ink/ScoreDial";
import { TallyMarks } from "@/components/ink/TallyMarks";
import { formatDate, formatMoney } from "@/lib/format";
import { getKnownProfiles, getLedgerRows, getMyProfile } from "@/lib/data";
import { scoreEvents, scorePeak, scoreStatsFor } from "@/lib/ledger";
import {
  improvementTips,
  improvingState,
  scoreBreakdown,
  tallyScore,
} from "@/lib/score";
import { firstName } from "@/lib/utils";
import { ImprovingPanel } from "./ImprovingPanel";

export const metadata: Metadata = { title: "Your Tally Score" };

export default async function ScorePage() {
  const [profile, rows, profiles] = await Promise.all([
    getMyProfile(),
    getLedgerRows(),
    getKnownProfiles(),
  ]);
  if (!profile) return null;

  const names = new Map(profiles.map((p) => [p.id, p]));
  const stats = scoreStatsFor(profile.id, rows);
  const score = tallyScore(stats);
  const breakdown = scoreBreakdown(stats);
  const tips = improvementTips(stats);
  const events = scoreEvents(profile.id, rows).reverse();
  const { peak, on: peakOn } = scorePeak(profile.id, rows, tallyScore);

  const peakSinceUsed = profile.improving_used_at
    ? scorePeak(
        profile.id,
        {
          ...rows,
          settlements: rows.settlements.filter(
            (s) => s.settled_at > (profile.improving_used_at as string),
          ),
        },
        tallyScore,
      ).peak
    : null;

  const improving = improvingState({
    score,
    peak,
    peakOn,
    peakSinceUsed,
    improvingSince: profile.improving_since,
    improvingUsedAt: profile.improving_used_at,
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-12">
      <SectionHeading eyebrow="Your record" title="Tally Score" />

      {/* ---- The number and where it came from ---------------------- */}
      <section className="flex flex-wrap items-center gap-8">
        <ScoreDial
          score={score}
          stats={stats}
          size={148}
          improving={improving.status === "active"}
        />

        <div className="min-w-0 flex-1">
          <ul className="flex flex-col gap-2">
            {breakdown.map((line, i) => (
              <li key={i} className="flex items-baseline justify-between gap-4 text-14">
                <span className="text-ink-soft">{line.label}</span>
                <span
                  className={`tabular font-display text-20 ${
                    line.delta < 0 ? "text-vermilion" : "text-navy"
                  }`}
                >
                  {line.delta > 0 && i > 0 ? "+" : ""}
                  {line.delta}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-12 text-ink-soft">
            Nothing here is hidden. Everyone starts at 50, settling adds, and letting a tally age
            past a month subtracts.
            {peak > score && peakOn
              ? ` Your best was ${peak}, back in ${formatDate(peakOn)}.`
              : ""}
          </p>
        </div>
      </section>

      {/* ---- Improving standing -------------------------------------- */}
      <ImprovingPanel state={improving} score={score} />

      {/* ---- How to move it ------------------------------------------ */}
      {tips.length > 0 && (
        <section>
          <p className="eyebrow text-cobalt">How to move it</p>
          <Card className="mt-4 px-6">
            <ul>
              {tips.map((tip, i) => (
                <li
                  key={i}
                  className="flex items-start justify-between gap-4 border-b border-navy/8 py-4 last:border-0"
                >
                  <span className="min-w-0">
                    <span className="block text-14 text-navy">{tip.action}</span>
                    <span className="mt-1 block text-12 text-ink-soft">{tip.why}</span>
                  </span>
                  <span className="tabular shrink-0 font-display text-20 text-cobalt">
                    +{tip.gain}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      {/* ---- The log ------------------------------------------------- */}
      <section>
        <p className="eyebrow text-cobalt">Everything that counted</p>

        {events.length === 0 ? (
          <Card className="mt-4">
            <EmptyState
              illustration="strokes"
              title="Nothing on your record yet"
              copy="Settle a tally and it lands here, with how long you took. That is the whole of what the score is made of."
            />
          </Card>
        ) : (
          <Card className="mt-4 px-6">
            <ul>
              {events.map((event, i) => {
                const other = names.get(event.otherId);
                const late = event.kind === "open" && event.days > 30;

                return (
                  <li
                    key={i}
                    className="flex items-center gap-4 border-b border-navy/8 py-4 last:border-0"
                  >
                    <Avatar
                      name={other?.name ?? "?"}
                      size={34}
                      managed={other?.is_managed}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-14 text-navy">
                        {event.kind === "settled"
                          ? `You paid ${firstName(other?.name ?? "someone")} ${formatMoney(
                              event.amount,
                              event.currency,
                            )}`
                          : `You still owe ${firstName(other?.name ?? "someone")} ${formatMoney(
                              event.amount,
                              event.currency,
                            )}`}
                      </p>
                      <p className={`mt-0.5 text-12 ${late ? "text-vermilion" : "text-ink-soft"}`}>
                        {event.kind === "settled"
                          ? event.days === 0
                            ? `Same day, on ${formatDate(event.date)}`
                            : `${event.days} ${event.days === 1 ? "day" : "days"} after it came up, on ${formatDate(event.date)}`
                          : `Open ${event.days} days, since ${formatDate(event.date)}${
                              late ? ". Past a month, so it is costing you five points" : ""
                            }`}
                      </p>
                    </div>
                    <TallyMarks
                      count={event.kind === "settled" ? 1 : 0}
                      max={1}
                      size="sm"
                      tone={late ? "vermilion" : "soft"}
                      animate={false}
                    />
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </section>

      <p className="text-12 text-ink-soft">
        Your score is visible to anyone deciding whether to lend to you, and to anyone looking at a
        tally of yours on{" "}
        <Link href="/exchange" className="text-cobalt underline underline-offset-4">
          the Exchange
        </Link>
        . It is the same arithmetic for everyone, and the reason a stranger can price your debt at
        all.
      </p>
    </div>
  );
}
