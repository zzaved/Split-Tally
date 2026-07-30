import Link from "next/link";
import { AmountDisplay } from "@/components/ink/AmountDisplay";
import { BrushStroke } from "@/components/ink/BrushStroke";
import { Avatar } from "@/components/ink/Card";
import { TallyMarks } from "@/components/ink/TallyMarks";
import { coverVariantFor } from "@/lib/utils";
import type { Group, Profile } from "@/lib/types";

/**
 * A group in a list. The cover stroke is chosen deterministically from the
 * group id, so a group always wears the same brush mark (BUILD.MD §5.5).
 */
export function GroupCard({
  group,
  members,
  expenseCount,
  yourNet,
}: {
  group: Group;
  members: Profile[];
  expenseCount: number;
  /** Positive: the group owes you. Negative: you owe the group. */
  yourNet: number;
}) {
  const shown = members.slice(0, 4);
  const overflow = members.length - shown.length;

  return (
    <Link
      href={`/groups/${group.id}`}
      className="group relative flex flex-col overflow-hidden rounded-card border border-navy/10 bg-cream-deep/60 p-6 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-cobalt/30 hover:shadow-ink"
    >
      <BrushStroke
        variant={coverVariantFor(group.id)}
        animate={false}
        className="pointer-events-none absolute -top-2 -right-4 h-16 w-36 opacity-30 transition-opacity duration-200 group-hover:opacity-45"
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate font-display text-28 font-medium text-navy">{group.name}</h3>
          <p className="mt-1 text-12 text-ink-soft">
            {group.currency}
            {group.archived && " · Archived"}
          </p>
        </div>
        <TallyMarks
          count={expenseCount}
          size="sm"
          tone="soft"
          animate={false}
          label={`${expenseCount} ${expenseCount === 1 ? "expense" : "expenses"}`}
        />
      </div>

      <div className="relative mt-6 flex items-end justify-between gap-4">
        <div className="flex -space-x-2">
          {shown.map((m) => (
            <Avatar key={m.id} name={m.name} size={30} managed={m.is_managed} />
          ))}
          {overflow > 0 && (
            <span className="inline-flex size-[30px] items-center justify-center rounded-full border border-navy/12 bg-cream text-11 text-ink-soft">
              +{overflow}
            </span>
          )}
        </div>

        <div className="text-right">
          <p className="eyebrow text-ink-soft">
            {yourNet > 0 ? "Owed to you" : yourNet < 0 ? "You owe" : "Settled"}
          </p>
          <div className="mt-1">
            <AmountDisplay
              value={Math.abs(yourNet)}
              currency={group.currency}
              size="sm"
              tone={yourNet > 0 ? "positive" : yourNet < 0 ? "negative" : "neutral"}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
