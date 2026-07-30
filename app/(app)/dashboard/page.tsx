import type { Metadata } from "next";
import Link from "next/link";
import { ActivityItem } from "@/components/app/ActivityItem";
import { Balances } from "@/components/app/Balances";
import { GroupCard } from "@/components/app/GroupCard";
import { BrushStroke } from "@/components/ink/BrushStroke";
import { ButtonLink } from "@/components/ink/Button";
import { Card, SectionHeading } from "@/components/ink/Card";
import { EmptyState } from "@/components/ink/EmptyState";
import { TallyMarks } from "@/components/ink/TallyMarks";
import { daysBetween } from "@/lib/format";
import {
  getActivity,
  getCheckins,
  getGroupMembers,
  getLedgerRows,
  getMyGroups,
  getMyProfile,
  getProfileMap,
} from "@/lib/data";
import { computePairBalances, groupNets, totalsFor } from "@/lib/ledger";
import { firstName } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const [profile, rows, groups, memberships, profiles, activity, checkins] = await Promise.all([
    getMyProfile(),
    getLedgerRows(),
    getMyGroups(),
    getGroupMembers(),
    getProfileMap(),
    getActivity(6),
    getCheckins(),
  ]);

  if (!profile) return null;

  const pairs = computePairBalances(rows);
  const totals = totalsFor(profile.id, pairs);

  const activeGroups = groups.filter((g) => !g.archived);
  const expenseCounts = new Map<string, number>();
  for (const e of rows.expenses) {
    expenseCounts.set(e.group_id, (expenseCounts.get(e.group_id) ?? 0) + 1);
  }

  const lastCheckin = checkins[0];
  const daysSinceCheckin = lastCheckin ? daysBetween(new Date(lastCheckin.created_at), new Date()) : null;
  const checkinDue = daysSinceCheckin === null || daysSinceCheckin >= 7;

  return (
    <div className="flex flex-col gap-16">
      {/* ---- Balances ------------------------------------------------ */}
      <section className="grid gap-12 md:grid-cols-[1fr_0.9fr] md:gap-16">
        <div>
          <p className="eyebrow text-cobalt">Good to see you, {firstName(profile.name)}</p>
          <div className="mt-8">
            <Balances totals={totals} />
          </div>
        </div>

        {checkinDue ? (
          <WeeklyTallyCard days={daysSinceCheckin} />
        ) : (
          <LastCheckinCard summary={lastCheckin?.summary ?? null} days={daysSinceCheckin ?? 0} />
        )}
      </section>

      {/* ---- Groups -------------------------------------------------- */}
      <section>
        <SectionHeading
          eyebrow="Your groups"
          title="Where the money is shared"
          action={
            <ButtonLink href="/groups/new" variant="secondary" size="sm">
              New group
            </ButtonLink>
          }
        />

        {activeGroups.length === 0 ? (
          <Card className="mt-8">
            <EmptyState
              title="No groups yet"
              copy="A group is anything you share costs on — a flat, a trip, a dinner club. Make one and add the people in it."
              action={<ButtonLink href="/groups/new">Create your first group</ButtonLink>}
            />
          </Card>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {activeGroups.map((group) => {
              const memberIds = memberships
                .filter((m) => m.group_id === group.id)
                .map((m) => m.user_id);
              const nets = groupNets(rows, group.id, memberIds);
              const members = memberIds
                .map((id) => profiles.get(id))
                .filter((p): p is NonNullable<typeof p> => Boolean(p));

              return (
                <GroupCard
                  key={group.id}
                  group={group}
                  members={members}
                  expenseCount={expenseCounts.get(group.id) ?? 0}
                  yourNet={nets[profile.id] ?? 0}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* ---- Activity preview ---------------------------------------- */}
      <section>
        <SectionHeading
          eyebrow="Lately"
          title="Recent activity"
          action={
            <Link
              href="/activity"
              className="eyebrow text-cobalt underline-offset-4 hover:underline"
            >
              See all
            </Link>
          }
        />

        {activity.length === 0 ? (
          <Card className="mt-8">
            <EmptyState
              illustration="strokes"
              title="Nothing tallied yet"
              copy="Every expense, settlement and sale lands here so you can retrace the story of your money."
            />
          </Card>
        ) : (
          <Card className="mt-8 px-6">
            <ul>
              {activity.map((item) => (
                <ActivityItem key={item.id} item={item} profiles={profiles} />
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function WeeklyTallyCard({ days }: { days: number | null }) {
  return (
    <Card className="relative flex h-fit flex-col overflow-hidden p-8 md:sticky md:top-24">
      <BrushStroke
        variant={5}
        className="pointer-events-none absolute -top-8 -right-10 h-40 w-40 opacity-25"
      />
      <div className="relative">
        <p className="eyebrow text-cobalt">The weekly tally</p>
        <h2 className="mt-4 font-display text-28 font-medium text-navy">
          {days === null
            ? "Let's tally up for the first time."
            : `It has been ${days} ${days === 1 ? "day" : "days"}. Let's tally up.`}
        </h2>
        <p className="mt-4 text-14 text-ink-soft">
          Three questions, about two minutes: the cash you spent, what is coming up, and who to
          settle with.
        </p>
      </div>

      <div className="relative mt-8 flex items-center gap-4">
        <ButtonLink href="/money?checkin=1">Start the tally</ButtonLink>
        <TallyMarks count={3} max={3} size="md" tone="soft" />
      </div>
    </Card>
  );
}

function LastCheckinCard({ summary, days }: { summary: string | null; days: number }) {
  return (
    <Card className="flex h-fit flex-col p-8 md:sticky md:top-24">
      <div>
        <p className="eyebrow text-cobalt">Your last tally</p>
        <p className="mt-4 font-display text-20 leading-relaxed text-navy">
          {summary ?? "You finished a check-in, but there was nothing to note."}
        </p>
      </div>
      <p className="mt-8 text-12 text-ink-soft">
        {days === 0 ? "Done today" : `${days} ${days === 1 ? "day" : "days"} ago`} · next one in{" "}
        {Math.max(0, 7 - days)} days
      </p>
    </Card>
  );
}
