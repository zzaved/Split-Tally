"use client";

import { useActionState, useMemo, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { AmountDisplay } from "@/components/ink/AmountDisplay";
import { Button } from "@/components/ink/Button";
import { Avatar } from "@/components/ink/Card";
import { EmptyState } from "@/components/ink/EmptyState";
import { FormMessage } from "@/components/ink/Field";
import { OrbGlyph } from "@/components/ink/Orb";
import { GuidedFill, type FillStep } from "@/components/voice/GuidedFill";
import { formatMoney, round2 } from "@/lib/format";
import { MAX_DISCOUNT, MIN_DISCOUNT } from "@/lib/pricing";
import { meansKeep, nudge, spokenNumber } from "@/lib/spoken";
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
  const listRef = useRef<HTMLUListElement | null>(null);
  const sliderRef = useRef<HTMLInputElement | null>(null);

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

  const price = picked ? round2(picked.amount * (1 - discount / 100)) : 0;

  /** Matches a spoken name against the tallies on offer, first names included. */
  function findReceivable(heard: string): Receivable | null {
    const h = heard.toLowerCase();
    return (
      receivables.find((r) => h.includes(r.debtorName.toLowerCase())) ??
      receivables.find((r) => h.includes(r.debtorName.toLowerCase().split(/\s+/)[0])) ??
      null
    );
  }

  /**
   * Two questions, and deliberately not a third.
   *
   * The walk stops before listing. Selling a tally moves real money and hands
   * the debt to someone else, so the last press stays a press: the numbers are
   * on screen by then and nobody should discover they sold something because a
   * recogniser heard "yes" in a noisy room.
   */
  const guidedSteps: FillStep[] = useMemo(
    () => [
      {
        name: "debtor",
        question: "Whose tally do you want to sell?",
        anchor: () => listRef.current,
        parse: (heard) => findReceivable(heard)?.debtorId ?? "",
        validate: (value) =>
          value ? null : "I could not find that name among the tallies you are owed.",
        describe: (value) =>
          receivables.find((r) => r.debtorId === value)?.debtorName ?? value,
        apply: (value) => {
          const match = receivables.find((r) => r.debtorId === value);
          if (match) choose(match);
        },
      },
      {
        name: "discount",
        // Asked only once the price exists, so the number being adjusted is
        // one you can already see.
        ready: () => pricing !== null && !pending,
        question: () =>
          pricing
            ? `I suggest ${pricing.discount_pct.toFixed(1)} percent off. Say keep it, or give me another number.`
            : "What discount would you like?",
        anchor: () => sliderRef.current,
        parse: (heard) => {
          if (meansKeep(heard)) return String(discount);
          const spoken = spokenNumber(heard);
          if (spoken !== null) return String(spoken);
          // "a bit more" means a bigger discount, so a smaller payout.
          const direction = nudge(heard);
          return direction ? String(discount + direction * 2.5) : "";
        },
        validate: (value) => {
          const n = Number(value);
          if (!value || Number.isNaN(n)) return "Say a percentage, or say keep it.";
          if (n < MIN_DISCOUNT || n > MAX_DISCOUNT) {
            return `It has to be between ${MIN_DISCOUNT} and ${MAX_DISCOUNT} percent.`;
          }
          return null;
        },
        describe: (value) => `${Number(value).toFixed(1)}% off`,
        apply: (value) => setDiscount(Number(value)),
      },
    ],
    // `choose` and `findReceivable` are redefined every render by design: they
    // close over state the walk needs to read as it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [receivables, pricing, pending, discount],
  );

  // Below every hook: an early return above them would change how many run
  // the moment somebody is owed their first tally.
  if (receivables.length === 0) {
    return (
      <EmptyState
        title="Nobody owes you yet"
        copy="Once a friend owes you something, you can sell that tally here and be paid today instead of whenever they get round to it."
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <GuidedFill
        steps={guidedSteps}
        label="Sell one by talking"
        intro="I can set this up. Two questions, then you check it and list it yourself."
      />
      {/* Step 1 */}
      <section>
        <p className="eyebrow text-cobalt">Step one · pick a tally</p>
        <ul ref={listRef} className="mt-4 flex flex-col gap-2">
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
                  ref={sliderRef}
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
