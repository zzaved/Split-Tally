import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { discountOf, ListingCard } from "@/components/app/ListingCard";
import { Card } from "@/components/ink/Card";
import { TallyMarks } from "@/components/ink/TallyMarks";
import { formatMoney } from "@/lib/format";
import { getKnownProfiles, getLedgerRows, getListing, getMyProfile } from "@/lib/data";
import { computeScores } from "@/lib/scores";
import { BAND_LABEL, buyingRisk, scoreBreakdown, scoreClusters } from "@/lib/score";
import { localPricing } from "@/lib/pricing";
import { firstName, possessive } from "@/lib/utils";
import { BuyButton } from "../ListingActions";

export const metadata: Metadata = { title: "Listing" };

export default async function ListingPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const [profile, listing, profiles, rows] = await Promise.all([
    getMyProfile(),
    getListing(id),
    getKnownProfiles(),
    getLedgerRows(),
  ]);

  if (!profile) return null;
  if (!listing) notFound();

  const byId = new Map(profiles.map((p) => [p.id, p]));
  const fallback = new Map(profiles.map((p) => [p.id, p.tally_score]));
  const scores = computeScores(rows, [listing.debtor_id], fallback);

  const debtor = byId.get(listing.debtor_id);
  const seller = byId.get(listing.seller_id);
  const entry = scores.get(listing.debtor_id);
  const score = entry?.score ?? debtor?.tally_score ?? 50;
  const clusters = scoreClusters(score);
  const breakdown = entry ? scoreBreakdown(entry.stats) : [];

  // The discount being asked, against what this debtor's own record prices it
  // at — that comparison is the only honest way to answer "is this a good buy".
  const offeredDiscount = discountOf(listing);
  const fair = entry
    ? localPricing({
        faceValue: Number(listing.face_value),
        currency: listing.currency,
        debtorName: firstName(debtor?.name ?? "They"),
        score,
        settledCount: entry.stats.settledCount,
        avgDays: entry.stats.avgDaysToSettle,
        overdueCount: entry.stats.overdueCount,
      })
    : null;

  const risk = entry
    ? buyingRisk(
        firstName(debtor?.name ?? "They"),
        score,
        entry.stats,
        offeredDiscount,
        fair?.discountPct ?? offeredDiscount,
      )
    : null;

  const isMine = listing.seller_id === profile.id;
  const isDebtor = listing.debtor_id === profile.id;
  const buyable = listing.status === "open" && !isMine && !isDebtor;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
      <Link href="/exchange" className="eyebrow text-cobalt underline-offset-4 hover:underline">
        ← Back to the Exchange
      </Link>

      <ListingCard
        listing={listing}
        debtor={debtor}
        seller={seller}
        debtorScore={score}
        debtorStats={entry?.stats}
      />

      {/* ---- Why this price ------------------------------------------ */}
      <Card className="p-6 md:p-8">
        <p className="eyebrow text-ink-soft">Why this price</p>

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <TallyMarks
            count={clusters.filled}
            max={clusters.total}
            size="lg"
            animate={false}
            label={`Tally Score ${score} out of 100`}
          />
          <span className="font-display text-28 text-navy">{score}</span>
          <span className="text-14 text-ink-soft">Tally Score</span>
        </div>

        {breakdown.length > 0 && (
          <ul className="mt-6 flex flex-col gap-2">
            {breakdown.map((line, i) => (
              <li key={i} className="flex items-baseline justify-between gap-4 text-14">
                <span className="text-ink-soft">{line.label}</span>
                <span
                  className={`tabular font-display text-20 ${
                    line.delta < 0 ? "text-vermilion" : "text-navy"
                  }`}
                >
                  {line.delta > 0 ? "+" : ""}
                  {line.delta}
                </span>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-6 text-12 text-ink-soft">
          The score is arithmetic, not a black box: everyone starts at 50, settling adds, and
          letting a tally age past a month subtracts.
        </p>
      </Card>

      {/* ---- What the score means for a buyer ------------------------- */}
      {entry && risk && (
        <Card
          className={
            risk.band === "weak" || risk.band === "unproven"
              ? "border-vermilion/25 p-6 md:p-8"
              : "p-6 md:p-8"
          }
        >
          <p
            className={`eyebrow ${
              risk.band === "weak" || risk.band === "unproven" ? "text-vermilion" : "text-cobalt"
            }`}
          >
            {BAND_LABEL[risk.band]}
          </p>
          <p className="mt-4 font-display text-28 leading-snug text-navy">{risk.headline}</p>
          <p className="mt-3 text-14 text-ink-soft">{risk.detail}</p>
          <p className="mt-5 text-12 text-ink-soft">
            Nobody is obliged to pay a tally faster because it changed hands. What you are buying is
            the wait, and the discount is what you are paid for taking it.
          </p>
        </Card>
      )}

      {/* ---- Buy ------------------------------------------------------ */}
      <Card className="p-6 md:p-8">
        {buyable ? (
          <>
            <p className="eyebrow text-ink-soft">Buy</p>
            <p className="mt-3 text-14 text-ink-soft">
              You pay {formatMoney(listing.asking_price, listing.currency)} and take on{" "}
              {possessive(firstName(debtor?.name ?? ""))} tally of{" "}
              {formatMoney(listing.face_value, listing.currency)}, {discountOf(listing)}% in your
              favour if they pay.
            </p>
            <div className="mt-6">
              <BuyButton
                id={listing.id}
                price={formatMoney(listing.asking_price, listing.currency)}
                faceValue={formatMoney(listing.face_value, listing.currency)}
                debtorName={firstName(debtor?.name ?? "They")}
              />
            </div>
          </>
        ) : (
          <p className="text-14 text-ink-soft">
            {listing.status === "sold"
              ? `Sold to ${byId.get(listing.buyer_id ?? "")?.name ?? "a buyer"}.`
              : listing.status === "withdrawn"
                ? "This listing was withdrawn."
                : isMine
                  ? "This is your listing."
                  : "This is your own tally: you cannot buy your own debt."}
          </p>
        )}
      </Card>
    </div>
  );
}
