import { AmountDisplay } from "@/components/ink/AmountDisplay";
import { BrushStroke } from "@/components/ink/BrushStroke";
import type { Totals } from "@/lib/ledger";

/**
 * The two headline numbers. One pair per currency, because Split Tally never
 * invents an exchange rate — a euro tally and a dollar tally stay apart.
 */
export function Balances({ totals }: { totals: Totals }) {
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

  return (
    <div className={single ? "" : "grid gap-10 sm:grid-cols-2 sm:gap-8"}>
      {currencies.map((currency, i) => {
        const { owedToYou, youOwe } = totals[currency];
        return (
          <div key={currency} className="relative">
            {i === 0 && (
              <BrushStroke
                variant={4}
                className="pointer-events-none absolute top-3 -left-8 h-[150px] w-[290px] opacity-25"
              />
            )}
            <div className="relative">
              {!single && <p className="eyebrow mb-5 text-cobalt">{currency}</p>}

              <p className="eyebrow text-ink-soft">Owed to you</p>
              <div className="mt-2">
                <AmountDisplay
                  value={owedToYou}
                  currency={currency}
                  size={single ? "hero" : "xl"}
                  tone={owedToYou > 0 ? "positive" : "neutral"}
                />
              </div>

              <p className="eyebrow mt-7 text-ink-soft">You owe</p>
              <div className="mt-2">
                <AmountDisplay
                  value={youOwe}
                  currency={currency}
                  size={single ? "lg" : "md"}
                  tone={youOwe > 0 ? "negative" : "neutral"}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
