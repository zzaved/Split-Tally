import { AmountDisplay } from "@/components/ink/AmountDisplay";
import { BrushStroke } from "@/components/ink/BrushStroke";
import { formatDate } from "@/lib/format";
import type { Converted } from "@/lib/fx";
import type { Totals } from "@/lib/ledger";

/**
 * The two headline numbers.
 *
 * When the tallies span more than one currency we show a single converted
 * figure at today's ECB reference rate, and keep every original currency
 * underneath it. The conversion is a convenience, not the ledger: what someone
 * owes you is still fifty euros whatever the rate says that is worth today,
 * and the label says as much.
 */
export function Balances({
  totals,
  owedConverted,
  owingConverted,
}: {
  totals: Totals;
  owedConverted?: Converted;
  owingConverted?: Converted;
}) {
  const currencies = Object.keys(totals).sort();

  if (currencies.length === 0) {
    return (
      <div className="relative">
        <p className="eyebrow text-ink-soft">Owed to you</p>
        <div className="mt-3">
          <AmountDisplay value={0} currency="USD" size="hero" tone="neutral" />
        </div>
        <p className="mt-6 max-w-sm text-14 text-ink-soft">
          Nothing is outstanding. Tell the orb about your next shared cost and this fills in.
        </p>
      </div>
    );
  }

  const single = currencies.length === 1;

  if (single) {
    const currency = currencies[0];
    const { owedToYou, youOwe } = totals[currency];
    return (
      <div className="relative">
        <BrushStroke
          variant={4}
          className="pointer-events-none absolute top-3 -left-8 h-[150px] w-[290px] opacity-25"
        />
        <div className="relative">
          <p className="eyebrow text-ink-soft">Owed to you</p>
          <div className="mt-2">
            <AmountDisplay
              value={owedToYou}
              currency={currency}
              size="hero"
              tone={owedToYou > 0 ? "positive" : "neutral"}
            />
          </div>
          <p className="eyebrow mt-7 text-ink-soft">You owe</p>
          <div className="mt-2">
            <AmountDisplay
              value={youOwe}
              currency={currency}
              size="lg"
              tone={youOwe > 0 ? "negative" : "neutral"}
            />
          </div>
        </div>
      </div>
    );
  }

  const asOf = owedConverted?.asOf ?? owingConverted?.asOf ?? null;
  const unconverted = [
    ...new Set([...(owedConverted?.unconverted ?? []), ...(owingConverted?.unconverted ?? [])]),
  ];

  return (
    <div className="relative">
      <BrushStroke
        variant={4}
        className="pointer-events-none absolute top-3 -left-8 h-[150px] w-[290px] opacity-25"
      />

      <div className="relative">
        <p className="eyebrow text-ink-soft">Owed to you</p>
        <div className="mt-2">
          <AmountDisplay
            value={owedConverted?.total ?? 0}
            currency={owedConverted?.currency ?? currencies[0]}
            size="hero"
            tone={(owedConverted?.total ?? 0) > 0 ? "positive" : "neutral"}
          />
        </div>

        <p className="eyebrow mt-7 text-ink-soft">You owe</p>
        <div className="mt-2">
          <AmountDisplay
            value={owingConverted?.total ?? 0}
            currency={owingConverted?.currency ?? currencies[0]}
            size="lg"
            tone={(owingConverted?.total ?? 0) > 0 ? "negative" : "neutral"}
          />
        </div>

        {/* The real ledger, currency by currency. */}
        <ul className="mt-8 flex flex-col gap-2 border-t border-navy/10 pt-5">
          {currencies.map((currency) => {
            const { owedToYou, youOwe } = totals[currency];
            return (
              <li key={currency} className="flex items-baseline justify-between gap-4 text-14">
                <span className="eyebrow text-cobalt">{currency}</span>
                <span className="flex items-baseline gap-5">
                  {owedToYou > 0 && (
                    <span className="flex items-baseline gap-2">
                      <span className="text-12 text-ink-soft">owed</span>
                      <AmountDisplay
                        value={owedToYou}
                        currency={currency}
                        size="sm"
                        tone="positive"
                      />
                    </span>
                  )}
                  {youOwe > 0 && (
                    <span className="flex items-baseline gap-2">
                      <span className="text-12 text-ink-soft">you owe</span>
                      <AmountDisplay
                        value={youOwe}
                        currency={currency}
                        size="sm"
                        tone="negative"
                      />
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>

        <p className="mt-4 max-w-sm text-12 text-ink-soft">
          {asOf
            ? `Totals converted at the European Central Bank rate for ${formatDate(asOf)}. The tallies themselves stay in the currency they were made in.`
            : "Rates are unavailable right now, so the totals only cover your own currency. The per-currency figures below are always exact."}
          {unconverted.length > 0 && ` No rate for ${unconverted.join(", ")}.`}
        </p>
      </div>
    </div>
  );
}
