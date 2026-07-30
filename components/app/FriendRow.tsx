import { AmountDisplay } from "@/components/ink/AmountDisplay";
import { Avatar } from "@/components/ink/Card";
import { TallyMarks } from "@/components/ink/TallyMarks";
import { scoreClusters } from "@/lib/score";
import type { Profile } from "@/lib/types";

export type FriendBalance = { currency: string; amount: number };

/**
 * One friend. The balance is the net across every group the two of you share,
 * kept per currency because Split Tally never converts (BUILD.MD §5.4).
 */
export function FriendRow({
  profile,
  balances,
  action,
}: {
  profile: Profile;
  /** Omit entirely on rows where a balance would be meaningless, such as a
      request that has not been accepted yet. */
  balances?: FriendBalance[];
  action?: React.ReactNode;
}) {
  const clusters = scoreClusters(profile.tally_score);
  const owed = balances?.filter((b) => b.amount > 0) ?? [];
  const owing = balances?.filter((b) => b.amount < 0) ?? [];

  return (
    <li className="flex flex-wrap items-center gap-4 border-b border-navy/8 py-5 last:border-0">
      <Avatar name={profile.name} size={44} managed={profile.is_managed} />

      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-16 font-medium text-navy">
          {profile.name}
          {profile.is_managed && (
            <span className="eyebrow rounded-full border border-cobalt/25 px-2 py-0.5 text-cobalt">
              Not on Split Tally yet
            </span>
          )}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <TallyMarks
            count={clusters.filled}
            max={clusters.total}
            size="sm"
            tone="soft"
            animate={false}
            label={`Tally Score ${profile.tally_score} out of 100`}
          />
          <span className="text-12 text-ink-soft">Tally Score {profile.tally_score}</span>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1">
        {balances?.length === 0 && <span className="text-14 text-ink-soft">Settled up</span>}

        {owed.map((b) => (
          <span key={`owed-${b.currency}`} className="flex items-baseline gap-2">
            <span className="text-12 text-ink-soft">owes you</span>
            <AmountDisplay value={b.amount} currency={b.currency} size="sm" tone="positive" />
          </span>
        ))}

        {owing.map((b) => (
          <span key={`owing-${b.currency}`} className="flex items-baseline gap-2">
            <span className="text-12 text-ink-soft">you owe</span>
            <AmountDisplay
              value={Math.abs(b.amount)}
              currency={b.currency}
              size="sm"
              tone="negative"
            />
          </span>
        ))}
      </div>

      {action && <div className="w-full sm:w-auto">{action}</div>}
    </li>
  );
}
