"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AmountDisplay } from "@/components/ink/AmountDisplay";
import { Button } from "@/components/ink/Button";
import { Card } from "@/components/ink/Card";
import { Field, FormMessage, MoneyInput, Select } from "@/components/ink/Field";
import { currencySymbol, formatMoney } from "@/lib/format";
import type { Transfer } from "@/lib/ledger";
import type { Profile } from "@/lib/types";
import { applySimplify, settleUp, type ActionResult } from "../actions";

function Submit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

/** Record a payment between two members, prefilled with what is outstanding. */
export function SettleForm({
  groupId,
  currency,
  members,
  meId,
  outstanding,
}: {
  groupId: string;
  currency: string;
  members: Profile[];
  meId: string;
  /** `${debtor}|${creditor}` → amount, so picking a pair prefills the amount. */
  outstanding: Record<string, number>;
}) {
  const [state, action] = useActionState<ActionResult, FormData>(settleUp, {});

  const firstDebt = Object.entries(outstanding)[0]?.[0]?.split("|") ?? [];
  const [from, setFrom] = useState(firstDebt[0] ?? meId);
  const [to, setTo] = useState(firstDebt[1] ?? members.find((m) => m.id !== meId)?.id ?? meId);

  const suggested = outstanding[`${from}|${to}`];
  const [amount, setAmount] = useState(suggested ? String(suggested) : "");

  function pick(nextFrom: string, nextTo: string) {
    setFrom(nextFrom);
    setTo(nextTo);
    const next = outstanding[`${nextFrom}|${nextTo}`];
    setAmount(next ? String(next) : "");
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="groupId" value={groupId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Who paid" htmlFor="fromUser">
          <Select
            id="fromUser"
            name="fromUser"
            value={from}
            onChange={(e) => pick(e.currentTarget.value, to)}
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id === meId ? `${m.name} (you)` : m.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Who received it" htmlFor="toUser">
          <Select
            id="toUser"
            name="toUser"
            value={to}
            onChange={(e) => pick(from, e.currentTarget.value)}
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id === meId ? `${m.name} (you)` : m.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field
        label={`Amount (${currency})`}
        htmlFor="settle-amount"
        hint={
          suggested
            ? `${formatMoney(suggested, currency)} is outstanding between them.`
            : "Nothing is outstanding between those two right now."
        }
      >
        <MoneyInput
          id="settle-amount"
          name="amount"
          symbol={currencySymbol(currency)}
          value={amount}
          onChange={(e) => setAmount(e.currentTarget.value)}
          placeholder="0"
          required
        />
      </Field>

      {state.error && <FormMessage>{state.error}</FormMessage>}
      {state.ok && <FormMessage tone="notice">{state.ok}</FormMessage>}

      <div>
        <Submit label="Record the payment" pendingLabel="Recording…" />
      </div>
    </form>
  );
}

/**
 * Simplify. The before/after is written out in plain English, and applying it
 * records suggestions rather than settling anything (§5.5).
 */
export function SimplifyPanel({
  groupId,
  currency,
  transfers,
  before,
  names,
}: {
  groupId: string;
  currency: string;
  transfers: Transfer[];
  before: number;
  names: Map<string, string>;
}) {
  const [state, action] = useActionState<ActionResult, FormData>(applySimplify, {});

  if (transfers.length === 0) {
    return (
      <Card className="p-6">
        <p className="eyebrow text-ink-soft">Simplify</p>
        <p className="mt-3 text-14 text-ink-soft">
          Everyone in this group is square. Nothing to simplify.
        </p>
      </Card>
    );
  }

  const saved = before - transfers.length;

  return (
    <Card className="p-6">
      <p className="eyebrow text-ink-soft">Simplify</p>

      <p className="mt-3 font-display text-20 leading-snug text-navy">
        {saved > 0
          ? `Instead of ${before} ${before === 1 ? "transfer" : "transfers"}, ${transfers.length}.`
          : `${transfers.length} ${transfers.length === 1 ? "transfer" : "transfers"} clears this group.`}
      </p>

      <ul className="mt-4 flex flex-col gap-2">
        {transfers.map((t, i) => (
          <li key={i} className="flex items-baseline justify-between gap-3 text-14 text-navy">
            <span>
              {names.get(t.from) ?? "Someone"} pays {names.get(t.to) ?? "someone"}
            </span>
            <AmountDisplay value={t.amount} currency={currency} size="sm" tone="neutral" />
          </li>
        ))}
      </ul>

      <form action={action} className="mt-5 flex flex-col gap-3">
        <input type="hidden" name="groupId" value={groupId} />
        {state.error && <FormMessage>{state.error}</FormMessage>}
        {state.ok && <FormMessage tone="notice">{state.ok}</FormMessage>}
        <div>
          <Submit label="Suggest this plan" pendingLabel="Saving…" />
        </div>
        <p className="text-12 text-ink-soft">
          This only proposes the payments. Record each one above when it actually happens.
        </p>
      </form>
    </Card>
  );
}
