"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { AmountDisplay } from "@/components/ink/AmountDisplay";
import { Button } from "@/components/ink/Button";
import { Avatar } from "@/components/ink/Card";
import { EmptyState } from "@/components/ink/EmptyState";
import { FormMessage } from "@/components/ink/Field";
import { OrbGlyph } from "@/components/ink/Orb";
import { formatMoney, round2 } from "@/lib/format";
import { MAX_DISCOUNT, MIN_DISCOUNT } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { createListing, priceReceivable, type ActionResult } from "./actions";

export type Receivable = {
  debtorId: string;
  debtorName: string;
  isManaged: boolean;
  currency: string;
  amount: number;
  groupId: string | null;
  score: number;
};

type Pricing = { suggested_price: number; discount_pct: number; rationale: string; source: string };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Listing…" : "List it"}
    </Button>
  );
}

/**
 * Sell in three steps (BUILD.MD §5.7): pick a receivable, let the AI price it,
 * adjust inside the 2%–35% clamp, confirm.
 */
export function SellFlow({ receivables }: { receivables: Receivable[] }) {
  const [state, action] = useActionState<ActionResult, FormData>(createListing, {});
  const [picked, setPicked] = useState<Receivable | null>(null);
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [discount, setDiscount] = useState(12);
  const [pending, startTransition] = useTransition();

  function choose(receivable: Receivable) {
    setPicked(receivable);
    setPricing(null);
    startTransition(async () => {
      const result = await priceReceivable({
        debtorId: receivable.debtorId,
        faceValue: receivable.amount,
        currency: receivable.currency,
      });
      setPricing(result);
      setDiscount(result.discount_pct);
    });
  }

  if (receivables.length === 0) {
    return (
      <EmptyState
        title="Nobody owes you yet"
        copy="Once a friend owes you something, you can sell that tally here and be paid today instead of whenever they get round to it."
      />
    );
  }

  const price = picked ? round2(picked.amount * (1 - discount / 100)) : 0;

  return (
    <div className="flex flex-col gap-8">
      {/* Step 1 */}
      <section>
        <p className="eyebrow text-cobalt">Step one · pick a tally</p>
        <ul className="mt-4 flex flex-col gap-2">
          {receivables.map((r) => {
            const active = picked?.debtorId === r.debtorId && picked?.currency === r.currency;
            return (
              <li key={`${r.debtorId}-${r.currency}`}>
                <button
                  type="button"
                  onClick={() => choose(r)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-card border px-4 py-3 text-left transition-colors duration-150",
                    active
                      ? "border-cobalt bg-cobalt/6"
                      : "border-navy/12 hover:border-cobalt/40 hover:bg-navy/3",
                  )}
                >
                  <Avatar name={r.debtorName} size={34} managed={r.isManaged} />
                  <span className="flex-1 text-14 text-navy">{r.debtorName} owes you</span>
                  <AmountDisplay
                    value={r.amount}
                    currency={r.currency}
                    size="sm"
                    tone="positive"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Step 2 */}
      {picked && (
        <section>
          <p className="eyebrow text-cobalt">Step two · the AI price</p>

          {pending || !pricing ? (
            <p className="mt-4 text-14 text-ink-soft">Reading {picked.debtorName}&rsquo;s record…</p>
          ) : (
            <div className="mt-4 rounded-card border border-navy/12 bg-cream p-5">
              <p className="flex items-center gap-2 text-14 text-navy">
                <OrbGlyph className="size-3" title="Priced by AI" />
                <span className="eyebrow text-cobalt">
                  {pricing.source === "ai" ? "AI fair price" : "Priced from their record"}
                </span>
              </p>
              <p className="mt-3 text-14 text-ink-soft">“{pricing.rationale}”</p>

              <div className="mt-5 flex items-end justify-between">
                <div>
                  <p className="eyebrow text-ink-soft">Face value</p>
                  <p className="tabular mt-1 font-display text-28 text-ink-soft">
                    {formatMoney(picked.amount, picked.currency)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="eyebrow text-ink-soft">You would get</p>
                  <div className="mt-1">
                    <AmountDisplay
                      value={price}
                      currency={picked.currency}
                      size="lg"
                      tone="positive"
                    />
                  </div>
                </div>
              </div>

              <label className="mt-6 block">
                <span className="eyebrow text-ink-soft">Discount · {discount.toFixed(1)}%</span>
                <input
                  type="range"
                  min={MIN_DISCOUNT}
                  max={MAX_DISCOUNT}
                  step={0.5}
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.currentTarget.value))}
                  className="mt-3 w-full accent-[var(--color-cobalt)]"
                  aria-label="Discount percentage"
                />
                <span className="mt-2 flex justify-between text-12 text-ink-soft">
                  <span>{MIN_DISCOUNT}%, barely a haircut</span>
                  <span>{MAX_DISCOUNT}%, paid today whatever it costs</span>
                </span>
              </label>
            </div>
          )}
        </section>
      )}

      {/* Step 3 */}
      {picked && pricing && (
        <section>
          <p className="eyebrow text-cobalt">Step three · confirm</p>
          <form action={action} className="mt-4 flex flex-col gap-4">
            <input type="hidden" name="debtorId" value={picked.debtorId} />
            <input type="hidden" name="currency" value={picked.currency} />
            <input type="hidden" name="groupId" value={picked.groupId ?? ""} />
            <input type="hidden" name="faceValue" value={picked.amount} />
            <input type="hidden" name="askingPrice" value={price} />
            <input type="hidden" name="suggestedPrice" value={pricing.suggested_price} />
            <input type="hidden" name="rationale" value={pricing.rationale} />

            <p className="text-14 text-ink-soft">
              You are selling {picked.debtorName}&rsquo;s{" "}
              {formatMoney(picked.amount, picked.currency)} tally for{" "}
              {formatMoney(price, picked.currency)}. Whoever buys it collects from{" "}
              {picked.debtorName} instead of you.
            </p>

            {state.error && <FormMessage>{state.error}</FormMessage>}
            {state.ok && <FormMessage tone="notice">{state.ok}</FormMessage>}

            <div>
              <Submit />
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
