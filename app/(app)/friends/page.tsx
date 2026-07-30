import type { Metadata } from "next";
import { FriendRow, type FriendBalance } from "@/components/app/FriendRow";
import { Card, SectionHeading } from "@/components/ink/Card";
import { EmptyState } from "@/components/ink/EmptyState";
import { getFriendships, getLedgerRows, getMyProfile, getProfileMap } from "@/lib/data";
import { balancesFor, computePairBalances } from "@/lib/ledger";
import { computeScores } from "@/lib/scores";
import { siteUrl } from "@/lib/site";
import { AddFriend } from "./AddFriend";
import { RequestActions } from "./RequestActions";

export const metadata: Metadata = { title: "Friends" };

export default async function FriendsPage() {
  const [profile, friendships, rows, profiles] = await Promise.all([
    getMyProfile(),
    getFriendships(),
    getLedgerRows(),
    getProfileMap(),
  ]);

  if (!profile) return null;

  const pairs = computePairBalances(rows);
  const myBalances = balancesFor(profile.id, pairs);

  const balancesByPerson = new Map<string, FriendBalance[]>();
  for (const b of myBalances) {
    const list = balancesByPerson.get(b.personId) ?? [];
    list.push({ currency: b.currency, amount: b.amount });
    balancesByPerson.set(b.personId, list);
  }

  const incoming = friendships.filter(
    (f) => f.status === "pending" && f.addressee === profile.id,
  );
  const outgoing = friendships.filter(
    (f) => f.status === "pending" && f.requester === profile.id,
  );

  const friendIds = friendships
    .filter((f) => f.status === "accepted")
    .map((f) => (f.requester === profile.id ? f.addressee : f.requester))
    .filter((id) => id !== profile.id);

  const friends = [...new Set(friendIds)]
    .map((id) => profiles.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .sort((a, b) => a.name.localeCompare(b.name));

  // The history behind each score, so a friend who has simply never settled
  // anything reads as "no record yet" rather than as a measured middling 50.
  const scores = computeScores(
    rows,
    friends.map((f) => f.id),
    new Map(friends.map((f) => [f.id, f.tally_score])),
  );

  return (
    <div className="flex flex-col gap-14">
      <SectionHeading eyebrow="Your circle" title="Friends" />

      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-14">
        <div className="flex flex-col gap-10">
          {incoming.length > 0 && (
            <section>
              <p className="eyebrow text-cobalt">
                {incoming.length} waiting for you
              </p>
              <Card className="mt-4 px-6">
                <ul>
                  {incoming.map((f) => {
                    const person = profiles.get(f.requester);
                    if (!person) return null;
                    return (
                      <FriendRow
                        key={f.id}
                        profile={person}
                        action={<RequestActions id={f.id} />}
                      />
                    );
                  })}
                </ul>
              </Card>
            </section>
          )}

          <section>
            <p className="eyebrow text-ink-soft">
              {friends.length} {friends.length === 1 ? "friend" : "friends"}
            </p>

            {friends.length === 0 ? (
              <Card className="mt-4">
                <EmptyState
                  title="Nobody here yet"
                  copy="Add the people you actually share costs with. If they are not on Split Tally, a first name is enough to get started."
                />
              </Card>
            ) : (
              <Card className="mt-4 px-6">
                <ul>
                  {friends.map((friend) => (
                    <FriendRow
                      key={friend.id}
                      profile={friend}
                      balances={balancesByPerson.get(friend.id) ?? []}
                      stats={scores.get(friend.id)?.stats}
                    />
                  ))}
                </ul>
              </Card>
            )}
          </section>

          {outgoing.length > 0 && (
            <section>
              <p className="eyebrow text-ink-soft">Sent, waiting on them</p>
              <Card className="mt-4 px-6">
                <ul>
                  {outgoing.map((f) => {
                    const person = profiles.get(f.addressee);
                    if (!person) return null;
                    return <FriendRow key={f.id} profile={person} />;
                  })}
                </ul>
              </Card>
            </section>
          )}
        </div>

        <div className="lg:sticky lg:top-24 lg:h-fit">
          <AddFriend siteUrl={siteUrl()} />
        </div>
      </div>
    </div>
  );
}
