import { AmountDisplay } from "@/components/ink/AmountDisplay";
import { Avatar } from "@/components/ink/Card";
import { OrbGlyph } from "@/components/ink/Orb";
import { formatDate, formatMoney } from "@/lib/format";
import type { Expense, Profile } from "@/lib/types";

/** A little paper glyph, so a statement row is as visibly AI-made as a spoken one. */
function PaperGlyph({ title }: { title: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" role="img" aria-label={title} className="size-3.5">
      <path
        d="M4 2.2h6.2L13 5v8.8H4z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
        className="text-cobalt"
      />
      <path d="M6.2 7.2h4.4M6.2 9.8h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" className="text-cobalt" />
    </svg>
  );
}

export function ExpenseRow({
  expense,
  payer,
  yourShare,
  action,
}: {
  expense: Expense;
  payer?: Profile;
  /** What this expense costs you; null when you are not in the split. */
  yourShare: number | null;
  action?: React.ReactNode;
}) {
  const youPaid = payer?.id && yourShare !== null;

  return (
    <li className="flex items-center gap-4 border-b border-navy/8 py-4 last:border-0">
      <Avatar name={payer?.name ?? "?"} size={36} managed={payer?.is_managed} />

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-16 font-medium text-navy">
          <span className="truncate">{expense.description}</span>
          {expense.created_via === "voice" && (
            <OrbGlyph className="size-3" title="Recorded by voice" />
          )}
          {expense.created_via === "statement" && <PaperGlyph title="Read from a statement" />}
        </p>
        <p className="mt-0.5 text-12 text-ink-soft">
          {payer?.name ?? "Someone"} paid {formatMoney(expense.amount, expense.currency)} ·{" "}
          {formatDate(expense.expense_date)}
          {expense.category ? ` · ${expense.category}` : ""}
        </p>
      </div>

      <div className="shrink-0 text-right">
        {youPaid ? (
          <>
            <p className="eyebrow text-ink-soft">Your share</p>
            <div className="mt-0.5">
              <AmountDisplay
                value={yourShare}
                currency={expense.currency}
                size="sm"
                tone="neutral"
              />
            </div>
          </>
        ) : (
          <p className="text-12 text-ink-soft">Not your split</p>
        )}
      </div>

      {/* Reserved even when empty, so rows with and without a remove control
          keep the same right edge. */}
      <div className="w-20 shrink-0 text-right">{action}</div>
    </li>
  );
}
