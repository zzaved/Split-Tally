import type { Metadata } from "next";
import { ListingCard } from "@/components/app/ListingCard";
import { BrushStroke } from "@/components/ink/BrushStroke";
import { Card, SectionHeading } from "@/components/ink/Card";
import { EmptyState } from "@/components/ink/EmptyState";
import {
  getKnownProfiles,
  getLedgerRows,
  getListings,
  getMyGroups,
  getMyProfile,
} from "@/lib/data";
import { balancesFor, computePairBalances } from "@/lib/ledger";
import { computeScores } from "@/lib/scores";
import { firstName } from "@/lib/utils";
import { Legend } from "./Legend";
import { SellFlow, type Receivable } from "./SellFlow";
import { WithdrawButton } from "./ListingActions";

export const metadata: Metadata = { title: "The Exchange" };

export default async function ExchangePage() {
  const [profile, listings, profiles, rows, groups] = await Promise.all([
    getMyProfile(),
    getListings(),
    getKnownProfiles(),
    getLedgerRows(),
    getMyGroups(),
  ]);

  if (!profile) return null;

  const byId = new Map(profiles.map((p) => [p.id, p]));
  const fallback = new Map(profiles.map((p) => [p.id, p.tally_score]));
  const scores = computeScores(rows, [...byId.keys()], fallback);

  const open = listings.filter((l) => l.status === "open" && l.seller_id !== profile.id);
  const mine = listings.filter((l) => l.seller_id === profile.id);

  // What this user could sell: every net pair balance in their favour.
  const pairs = computePairBalances(rows);
  const groupOf = new Map(groups.map((g) => [g.currency, g.id]));

  const listedAlready = new Map<string, number>();
  for (const l of listings) {
    if (l.seller_id !== profile.id || l.status !== "open") continue;
    const key = `${l.debtor_id}|${l.currency}`;
    listedAlready.set(key, (listedAlready.get(key) ?? 0) + Number(l.face_value));
  }

  const receivables: Receivable[] = balancesFor(profile.id, pairs)
    .filter((b) => b.amount > 1)
    .map((b) => {
      const key = `${b.personId}|${b.currency}`;
      const free = Math.round((b.amount - (listedAlready.get(key) ?? 0)) * 100) / 100;
      const person = byId.get(b.personId);
      return {
        debtorId: b.personId,
        debtorName: person ? firstName(person.name) : "Someone",
        isManaged: Boolean(person?.is_managed),
        currency: b.currency,
        amount: free,
        groupId: groupOf.get(b.currency) ?? null,
        score: scores.get(b.personId)?.score ?? 50,
      };
    })
    .filter((r) => r.amount > 1)
    .sort((a, b) => b.amount - a.amount);

  return (
    <div className="flex flex-col gap-14">
      {/* ---- Explainer ---------------------------------------------- */}
      <section className="relative overflow-hidden">
        <BrushStroke
          variant={1}
          className="pointer-events-none absolute -top-4 right-0 h-16 w-72 opacity-30"
        />
        <div className="relative">
          <p className="eyebrow text-cobalt">The Exchange</p>
          <h1 className="mt-4 max-w-2xl font-display text-40 font-medium text-navy md:text-56">
            Since the 1100s, tallies have been traded.
          </h1>
          <p className="mt-5 max-w-xl text-16 text-ink-soft">
            Sell what you are owed. Get paid today. Whoever buys the tally collects from the debtor
            instead of you.
          </p>
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:gap-14">
        {/* ---- Browse ----------------------------------------------- */}
        <div className="flex flex-col gap-10">
          <section>
            <SectionHeading eyebrow={`${open.length} open`} title="On the market" />
            {open.length === 0 ? (
              <Card className="mt-6">
                <EmptyState
                  illustration="strokes"
                  title="Nothing for sale right now"
                  copy="When someone needs their money before their friend can pay, their tally shows up here."
                />
              </Card>
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-2">
                {open.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    debtor={byId.get(listing.debtor_id)}
                    seller={byId.get(listing.seller_id)}
                    debtorScore={scores.get(listing.debtor_id)?.score ?? 50}
                    debtorStats={scores.get(listing.debtor_id)?.stats}
                    href={`/exchange/${listing.id}`}
                  />
                ))}
              </div>
            )}
          </section>

          {mine.length > 0 && (
            <section>
              <SectionHeading eyebrow="Yours" title="My listings" />
              <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-2">
                {mine.map((listing) => (
                  <div key={listing.id} className="flex flex-col gap-3">
                    <ListingCard
                      listing={listing}
                      debtor={byId.get(listing.debtor_id)}
                      debtorScore={scores.get(listing.debtor_id)?.score ?? 50}
                      debtorStats={scores.get(listing.debtor_id)?.stats}
                    />
                    {listing.status === "open" && <WithdrawButton id={listing.id} />}
                    {listing.status === "sold" && (
                      <p className="text-12 text-ink-soft">
                        Sold to {byId.get(listing.buyer_id ?? "")?.name ?? "a buyer"}.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ---- Sell ------------------------------------------------- */}
        <div className="flex flex-col gap-8 lg:sticky lg:top-24 lg:h-fit">
          <Card className="p-6 md:p-8">
            <p className="eyebrow text-ink-soft">Sell a tally</p>
            <p className="mt-2 text-12 text-ink-soft">
              Or tell the orb: &ldquo;sell Paulo&rsquo;s fifty&rdquo;.
            </p>
            <div className="mt-6">
              <SellFlow receivables={receivables} />
            </div>
          </Card>

          <Legend />
        </div>
      </div>
    </div>
  );
}
