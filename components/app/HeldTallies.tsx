import { AmountDisplay } from "@/components/ink/AmountDisplay";
import { Avatar, Card } from "@/components/ink/Card";
import { formatMoney, round2 } from "@/lib/format";
import type { Claim, Listing, Profile } from "@/lib/types";

export type HeldTally = {
  claim: Claim;
  listing: Listing | undefined;
  debtor: Profile | undefined;
};

/**
 * What you bought on the Exchange and are now waiting to collect.
 *
 * This is the whole reason a receivable is worth buying: you pay 45 today for
 * a 50 that arrives later, and the 5 is what you earned for waiting. Until the
 * debtor actually pays it is a position, not a profit — the copy says "if they
 * all pay" rather than pretending the money is already yours.
 */
export function HeldTallies({ held }: { held: HeldTally[] }) {
  if (held.length === 0) return null;

  // Positions are per currency, because a euro gain and a dollar gain are not
  // the same number and must never be added together.
  const byCurrency = new Map<string, { paid: number; face: number; count: number }>();
  for (const h of held) {
    const currency = h.claim.currency;
    const entry = byCurrency.get(currency) ?? { paid: 0, face: 0, count: 0 };
    entry.face = round2(entry.face + Number(h.claim.amount));
    entry.paid = round2(entry.paid + Number(h.listing?.asking_price ?? h.claim.amount));
    entry.count += 1;
    byCurrency.set(currency, entry);
  }

  return (
    <section>
      <p className="eyebrow text-cobalt">Tallies you hold</p>
      <h2 className="mt-4 font-display text-28 font-medium text-navy md:text-40">
        Bought on the Exchange
      </h2>

      <div className="mt-8 grid gap-6 md:grid-cols-[0.9fr_1.1fr] md:gap-10">
        <div className="flex flex-col gap-6">
          {[...byCurrency.entries()].map(([currency, totals]) => {
            const gain = round2(totals.face - totals.paid);
            return (
              <div key={currency}>
                <p className="eyebrow text-ink-soft">
                  {totals.count} {totals.count === 1 ? "tally" : "tallies"} · {currency}
                </p>
                <div className="mt-2">
                  <AmountDisplay
                    value={gain}
                    currency={currency}
                    size="lg"
                    tone={gain > 0 ? "positive" : "neutral"}
                    showSign
                  />
                </div>
                <p className="mt-2 text-14 text-ink-soft">
                  ahead, if they all pay. You paid {formatMoney(totals.paid, currency)} for{" "}
                  {formatMoney(totals.face, currency)} of debt.
                </p>
              </div>
            );
          })}
        </div>

        <Card className="px-6">
          <ul>
            {held.map((h) => {
              const face = Number(h.claim.amount);
              const paid = Number(h.listing?.asking_price ?? face);
              const gain = round2(face - paid);

              return (
                <li
                  key={h.claim.id}
                  className="flex items-center gap-4 border-b border-navy/8 py-4 last:border-0"
                >
                  <Avatar
                    name={h.debtor?.name ?? "?"}
                    size={34}
                    managed={h.debtor?.is_managed}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-14 font-medium text-navy">
                      {h.debtor?.name ?? "Someone"} owes you
                    </p>
                    <p className="text-12 text-ink-soft">
                      You paid {formatMoney(paid, h.claim.currency)}
                      {gain > 0 && ` · ${formatMoney(gain, h.claim.currency)} to gain`}
                    </p>
                  </div>
                  <AmountDisplay
                    value={face}
                    currency={h.claim.currency}
                    size="sm"
                    tone="positive"
                  />
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </section>
  );
}
