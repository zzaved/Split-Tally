"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AmountDisplay } from "@/components/ink/AmountDisplay";
import { Card } from "@/components/ink/Card";
import { FormMessage } from "@/components/ink/Field";
import { TallyMarks } from "@/components/ink/TallyMarks";
import type { Transfer } from "@/lib/ledger";
import { cn } from "@/lib/utils";
import { toggleSimplifyMode, type ActionResult } from "../actions";

function Switch({ enabled }: { enabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      role="switch"
      aria-checked={enabled}
      aria-label="Netted settling"
      disabled={pending}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-200 disabled:opacity-50",
        enabled ? "border-cobalt bg-cobalt" : "border-navy/20 bg-cream",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 size-4.5 rounded-full transition-[left] duration-200",
          enabled ? "left-[22px] bg-cream" : "left-0.5 bg-navy/35",
        )}
      />
    </button>
  );
}

/**
 * Who pays whom, and the switch that decides how that question is answered.
 *
 * Off, the group lists the literal debts: every pair that owes something.
 * On, the ring is untangled first, so three people each owing the next 5
 * shows as nobody owing anything at all.
 */
export function SettleMode({
  groupId,
  currency,
  enabled,
  canToggle,
  direct,
  netted,
  names,
}: {
  groupId: string;
  currency: string;
  enabled: boolean;
  canToggle: boolean;
  /** Literal pairwise debts. */
  direct: Transfer[];
  /** The same debts after cycles cancel. */
  netted: Transfer[];
  names: Map<string, string>;
}) {
  const [state, action] = useActionState<ActionResult, FormData>(toggleSimplifyMode, {});
  const shown = enabled ? netted : direct;
  const saved = direct.length - netted.length;

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow text-ink-soft">Who pays whom</p>
          <p className="mt-2 text-12 text-ink-soft">
            {enabled ? "Netted: circles cancel" : "Literal: everyone pays who they owe"}
          </p>
        </div>

        <form action={action} className="flex items-center gap-3">
          <input type="hidden" name="groupId" value={groupId} />
          <input type="hidden" name="enabled" value={enabled ? "false" : "true"} />
          {canToggle ? (
            <Switch enabled={enabled} />
          ) : (
            <span className="eyebrow text-ink-soft">{enabled ? "On" : "Off"}</span>
          )}
        </form>
      </div>

      {shown.length === 0 ? (
        <div className="mt-6 flex items-center gap-3">
          <TallyMarks count={0} max={5} size="sm" tone="soft" animate={false} />
          <p className="text-14 text-ink-soft">
            {enabled && direct.length > 0
              ? "Nobody owes anybody. The debts here run in a circle and cancel out."
              : "Everyone in this group is square."}
          </p>
        </div>
      ) : (
        <ul className="mt-5 flex flex-col gap-2">
          {shown.map((t, i) => (
            <li key={i} className="flex items-baseline justify-between gap-3 text-14 text-navy">
              <span>
                {names.get(t.from) ?? "Someone"} pays {names.get(t.to) ?? "someone"}
              </span>
              <AmountDisplay value={t.amount} currency={currency} size="sm" tone="neutral" />
            </li>
          ))}
        </ul>
      )}

      {!enabled && saved > 0 && (
        <p className="mt-5 text-12 text-ink-soft">
          Netting would turn these {direct.length} transfers into {netted.length}.
        </p>
      )}

      {enabled && saved > 0 && (
        <p className="mt-5 text-12 text-ink-soft">
          {direct.length} separate debts, settled in {netted.length}.
        </p>
      )}

      <p className="mt-4 text-12 text-ink-soft">
        {enabled
          ? "Netting can ask you to pay someone you never borrowed from. Turn it off if the group would rather keep each debt with the person it started with."
          : "Turn this on and debts that go in a circle cancel: if you owe Pedro, Pedro owes Júlia and Júlia owes you the same amount, nobody pays anything."}
      </p>

      {!canToggle && (
        <p className="mt-3 text-12 text-ink-soft">
          Only whoever created the group can change this.
        </p>
      )}

      {state.error && (
        <div className="mt-4">
          <FormMessage>{state.error}</FormMessage>
        </div>
      )}
      {state.ok && (
        <div className="mt-4">
          <FormMessage tone="notice">{state.ok}</FormMessage>
        </div>
      )}
    </Card>
  );
}
