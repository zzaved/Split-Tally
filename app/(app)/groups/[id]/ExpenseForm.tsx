"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ink/Button";
import { Avatar } from "@/components/ink/Card";
import { Field, FormMessage, Input, MoneyInput, Select } from "@/components/ink/Field";
import { currencySymbol, round2, toDateInput } from "@/lib/format";
import { resolveSplit, type SplitMode } from "@/lib/ledger";
import { CATEGORIES } from "@/lib/types";
import type { Profile } from "@/lib/types";
import type { RiskNote } from "@/lib/score";
import { spokenNumber } from "@/lib/spoken";
import { cn } from "@/lib/utils";
import { GuidedFill, type FillStep } from "@/components/voice/GuidedFill";
import { addExpenseForm, type ActionResult } from "../actions";

const MODES: { id: SplitMode; label: string; hint: string }[] = [
  { id: "equal", label: "Equally", hint: "Everyone pays the same." },
  { id: "exact", label: "Exact amounts", hint: "Type what each person owes." },
  { id: "percent", label: "Percentages", hint: "Has to add up to 100%." },
  { id: "shares", label: "Shares", hint: "Two shares costs twice one share." },
];

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Saving…" : "Record expense"}
    </Button>
  );
}

/**
 * The manual form. It exists because it is the fallback, and because the
 * contrast is what makes speaking an expense feel like a shortcut rather than
 * a gimmick (BUILD.MD §5.5).
 */
export function ExpenseForm({
  groupId,
  currency,
  members,
  meId,
  risks,
}: {
  groupId: string;
  currency: string;
  members: Profile[];
  meId: string;
  /** Repayment record of each member, keyed by id. Only the ones worth a word appear. */
  risks: Record<string, RiskNote>;
}) {
  const [state, action] = useActionState<ActionResult, FormData>(addExpenseForm, {});
  const formRef = useRef<HTMLFormElement>(null);

  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<SplitMode>("equal");
  const [participants, setParticipants] = useState<string[]>(members.map((m) => m.id));
  const [values, setValues] = useState<Record<string, string>>({});
  const [paidBy, setPaidBy] = useState(meId);
  const paidByMe = paidBy === meId;

  const symbol = currencySymbol(currency);
  const total = round2(Number(amount) || 0);

  const numericValues = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [id, v] of Object.entries(values)) out[id] = Number(v) || 0;
    return out;
  }, [values]);

  const preview = useMemo(() => {
    if (total <= 0 || participants.length === 0) return {};
    return resolveSplit(total, participants, mode, numericValues);
  }, [total, participants, mode, numericValues]);

  const { remainder, remainderLabel, blocked } = useMemo(() => {
    if (mode === "exact") {
      const entered = participants.reduce((sum, id) => sum + (numericValues[id] ?? 0), 0);
      const left = round2(total - entered);
      return {
        remainder: left,
        remainderLabel:
          left === 0
            ? "Adds up exactly."
            : left > 0
              ? `${symbol}${left.toFixed(2)} still to allocate.`
              : `${symbol}${Math.abs(left).toFixed(2)} over the total.`,
        blocked: total > 0 && Math.abs(left) > 0.005,
      };
    }
    if (mode === "percent") {
      const entered = participants.reduce((sum, id) => sum + (numericValues[id] ?? 0), 0);
      const left = round2(100 - entered);
      return {
        remainder: left,
        remainderLabel:
          left === 0 ? "Adds up to 100%." : left > 0 ? `${left}% left.` : `${Math.abs(left)}% over.`,
        blocked: Math.abs(left) > 0.005,
      };
    }
    return { remainder: 0, remainderLabel: "", blocked: false };
  }, [mode, participants, numericValues, total, symbol]);

  /**
   * Only the three things that actually need saying. The date defaults to
   * today, the split defaults to equally between everyone, and asking about
   * either out loud would make the quick path slower than the form.
   */
  const steps: FillStep[] = useMemo(
    () => [
      {
        name: "description",
        question: "What was it for?",
        validate: (v) => (v.trim().length < 2 ? "I did not catch that." : null),
      },
      {
        name: "amount",
        question: `How much, in ${currency}?`,
        parse: (heard) => {
          const spoken = spokenNumber(heard);
          return spoken === null ? "" : String(spoken);
        },
        validate: (v) => (!v || Number(v) <= 0 ? "I need a number above zero." : null),
      },
      {
        name: "paidBy",
        question: "Who paid?",
        parse: (heard) => {
          const h = heard.toLowerCase();
          if (/\b(me|i|myself)\b/.test(h)) {
            return members.find((m) => m.id === meId)?.name ?? "";
          }
          const match = members.find((m) => h.includes(m.name.toLowerCase().split(/\s+/)[0]));
          return match?.name ?? heard;
        },
      },
    ],
    [currency, members, meId],
  );

  function toggle(id: string) {
    setParticipants((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  }

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-6">
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="mode" value={mode} />
      {participants.map((id) => (
        <input key={id} type="hidden" name="participants" value={id} />
      ))}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="What was it" htmlFor="description" className="sm:col-span-2">
          <Input id="description" name="description" placeholder="Dinner at Can Pep" required />
        </Field>

        <Field label={`Amount (${currency})`} htmlFor="amount">
          <MoneyInput
            id="amount"
            name="amount"
            symbol={symbol}
            value={amount}
            onChange={(e) => setAmount(e.currentTarget.value)}
            placeholder="0"
            required
          />
        </Field>

        <Field label="Date" htmlFor="date">
          <Input id="date" name="date" type="date" defaultValue={toDateInput()} />
        </Field>

        <Field label="Paid by" htmlFor="paidBy">
          <Select
            id="paidBy"
            name="paidBy"
            value={paidBy}
            onChange={(e) => setPaidBy(e.currentTarget.value)}
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id === meId ? `${m.name} (you)` : m.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Category" htmlFor="category">
          <Select id="category" name="category" defaultValue="">
            <option value="">Not sorted yet</option>
            {CATEGORIES.filter((c) => c !== "Income").map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {/* ---- Split -------------------------------------------------- */}
      <div>
        <p className="eyebrow text-ink-soft">Split</p>

        <div className="mt-3 flex flex-wrap gap-1 rounded-full border border-navy/10 bg-cream p-1">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              aria-pressed={mode === m.id}
              className={cn(
                "eyebrow flex-1 rounded-full px-3 py-2 whitespace-nowrap transition-colors duration-150",
                mode === m.id ? "bg-cobalt text-cream" : "text-ink-soft hover:text-navy",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        <p className="mt-2.5 text-12 text-ink-soft">
          {MODES.find((m) => m.id === mode)?.hint}
        </p>

        <ul className="mt-4 flex flex-col">
          {members.map((member) => {
            const included = participants.includes(member.id);
            const share = preview[member.id];

            return (
              <li
                key={member.id}
                className="flex items-center gap-3 border-b border-navy/8 py-3 last:border-0"
              >
                <label className="flex flex-1 cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={included}
                    onChange={() => toggle(member.id)}
                    className="size-4 accent-[var(--color-cobalt)]"
                    aria-label={`Include ${member.name}`}
                  />
                  <Avatar name={member.name} size={30} managed={member.is_managed} />
                  <span className="text-14 text-navy">
                    {member.id === meId ? `${member.name} (you)` : member.name}
                  </span>
                </label>

                {included && mode !== "equal" && (
                  <input
                    name={`value:${member.id}`}
                    inputMode="decimal"
                    value={values[member.id] ?? ""}
                    onChange={(e) => {
                      // Read the value here, not inside the updater. React can
                      // replay a queued updater during a later render, and by
                      // then `currentTarget` is null: unchecking somebody after
                      // typing an amount threw straight through the reducer and
                      // took the whole form with it.
                      const next = e.currentTarget.value;
                      setValues((v) => ({ ...v, [member.id]: next }));
                    }}
                    placeholder={mode === "percent" ? "%" : mode === "shares" ? "1" : "0"}
                    className="tabular w-24 rounded-well border border-navy/15 bg-cream px-3 py-1.5 text-right text-14 focus:border-cobalt focus:outline-none focus:ring-2 focus:ring-cobalt/25"
                    aria-label={`${member.name} ${mode === "percent" ? "percentage" : mode === "shares" ? "shares" : "amount"}`}
                  />
                )}

                <span className="tabular w-24 text-right font-display text-20 text-ink-soft">
                  {included && share !== undefined ? `${symbol}${share.toFixed(2)}` : "—"}
                </span>
              </li>
            );
          })}
        </ul>

        {remainderLabel && (
          <p
            className={cn(
              "mt-3 text-12",
              Math.abs(remainder) < 0.005 ? "text-ink-soft" : "text-vermilion",
            )}
            role="status"
          >
            {remainderLabel}
          </p>
        )}
      </div>

      {/* Whoever is about to owe you, and has a record that says something.
          Only shown when the money is going out from you: being owed by a
          slow payer is the risk; owing one is not. */}
      {paidByMe &&
        participants
          .filter((id) => id !== meId && risks[id])
          .map((id) => {
            const note = risks[id];
            return (
              <div
                key={id}
                className={cn(
                  "rounded-well px-3.5 py-3",
                  note.band === "weak" ? "bg-vermilion/8" : "bg-cream",
                )}
              >
                <p
                  className={cn(
                    "text-14",
                    note.band === "weak" ? "text-vermilion" : "text-navy",
                  )}
                >
                  {note.headline}
                </p>
                <p className="mt-1 text-12 text-ink-soft">{note.detail}</p>
              </div>
            );
          })}

      {state.error && <FormMessage>{state.error}</FormMessage>}
      {state.ok && <FormMessage tone="notice">{state.ok}</FormMessage>}

      <div className="flex flex-wrap items-center gap-3">
        <Submit />
        <GuidedFill
          steps={steps}
          formRef={formRef}
          intro="I will ask three things and write each one into the form. The date and the split stay as they are unless you change them."
        />
        {blocked && (
          <span className="text-12 text-vermilion">The split has to add up before it saves.</span>
        )}
      </div>
    </form>
  );
}
