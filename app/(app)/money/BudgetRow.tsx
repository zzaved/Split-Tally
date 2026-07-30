"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AmountDisplay } from "@/components/ink/AmountDisplay";
import { Button } from "@/components/ink/Button";
import { Field, FormMessage, MoneyInput, Select } from "@/components/ink/Field";
import { TallyMarks } from "@/components/ink/TallyMarks";
import { currencySymbol, formatMoney } from "@/lib/format";
import { CATEGORIES } from "@/lib/types";
import { removeBudget, setBudget, type ActionResult } from "./actions";

const MARKS = 20;

/**
 * A budget as tally marks filling toward the cap. Over the cap the whole row
 * turns vermilion and says so in words as well as colour (BUILD.MD §5.6, §10).
 */
export function BudgetRow({
  category,
  spent,
  cap,
  currency,
}: {
  category: string;
  spent: number;
  cap: number;
  currency: string;
}) {
  const [state, action] = useActionState<ActionResult, FormData>(removeBudget, {});
  const ratio = cap > 0 ? spent / cap : 0;
  const over = ratio > 1;
  const filled = Math.min(MARKS, Math.round(ratio * MARKS));

  return (
    <li className="border-b border-navy/8 py-5 last:border-0">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-16 font-medium text-navy">{category}</p>
        <p className="flex items-baseline gap-2">
          <AmountDisplay
            value={spent}
            currency={currency}
            size="sm"
            tone={over ? "negative" : "neutral"}
          />
          <span className="text-12 text-ink-soft">of {formatMoney(cap, currency)}</span>
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <TallyMarks
          count={filled}
          max={MARKS}
          size="sm"
          tone={over ? "vermilion" : "cobalt"}
          animate={false}
          label={`${Math.round(ratio * 100)}% of the ${category} budget used`}
        />
        <span className={`text-12 ${over ? "text-vermilion" : "text-ink-soft"}`}>
          {over
            ? `${formatMoney(spent - cap, currency)} over budget`
            : `${formatMoney(cap - spent, currency)} left`}
        </span>

        <form action={action} className="ml-auto">
          <input type="hidden" name="category" value={category} />
          <button
            type="submit"
            className="eyebrow rounded-full px-2.5 py-1 text-ink-soft transition-colors duration-150 hover:bg-navy/5 hover:text-navy"
          >
            Remove
          </button>
        </form>
      </div>

      {state.error && (
        <p className="mt-2 text-12 text-vermilion" role="alert">
          {state.error}
        </p>
      )}
    </li>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Saving…" : "Set budget"}
    </Button>
  );
}

export function BudgetForm({ currency, used }: { currency: string; used: string[] }) {
  const [state, action] = useActionState<ActionResult, FormData>(setBudget, {});
  const available = CATEGORIES.filter((c) => c !== "Income" && !used.includes(c));

  if (available.length === 0) {
    return <p className="text-14 text-ink-soft">Every category already has a cap.</p>;
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category" htmlFor="budget-category">
          <Select id="budget-category" name="category" defaultValue={available[0]}>
            {available.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={`Monthly cap (${currency})`} htmlFor="budget-amount">
          <MoneyInput
            id="budget-amount"
            name="amount"
            symbol={currencySymbol(currency)}
            placeholder="400"
            required
          />
        </Field>
      </div>

      {state.error && <FormMessage>{state.error}</FormMessage>}
      {state.ok && <FormMessage tone="notice">{state.ok}</FormMessage>}

      <div>
        <Submit />
      </div>
      <p className="text-12 text-ink-soft">
        Or say it: &ldquo;keep my food budget at 400&rdquo;.
      </p>
    </form>
  );
}
