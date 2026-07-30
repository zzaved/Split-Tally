import Link from "next/link";
import { AmountDisplay } from "@/components/ink/AmountDisplay";
import { Avatar } from "@/components/ink/Card";
import { OrbGlyph } from "@/components/ink/Orb";
import { TallyMarks } from "@/components/ink/TallyMarks";
import { daysBetween, formatMoney } from "@/lib/format";
import { scoreClusters } from "@/lib/score";
import type { Listing, Profile } from "@/lib/types";

export function discountOf(listing: Listing): number {
  return Math.round(((listing.face_value - listing.asking_price) / listing.face_value) * 1000) / 10;
}

export function ListingCard({
  listing,
  debtor,
  seller,
  debtorScore,
  href,
}: {
  listing: Listing;
  debtor?: Profile;
  seller?: Profile;
  debtorScore: number;
  href?: string;
}) {
  const clusters = scoreClusters(debtorScore);
  const openDays = daysBetween(new Date(listing.created_at), new Date());
  const discount = discountOf(listing);

  const body = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        {/* The floor matters: with `min-w-0` this block shrinks to nothing, so
            the chip never gets pushed onto its own line and lands on top of the
            name instead. A floor forces the wrap on a narrow card. */}
        <div className="flex min-w-[10rem] flex-1 items-center gap-3">
          <Avatar name={debtor?.name ?? "?"} size={40} managed={debtor?.is_managed} />
          <div>
            <p className="truncate text-14 font-medium text-navy">
              {debtor?.name ?? "Someone"} owes this tally
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <TallyMarks
                count={clusters.filled}
                max={clusters.total}
                size="sm"
                tone="soft"
                animate={false}
                label={`Tally Score ${debtorScore} out of 100`}
              />
              <span className="text-12 whitespace-nowrap text-ink-soft">Tally Score {debtorScore}</span>
            </div>
          </div>
        </div>

        {listing.ai_suggested_price !== null && (
          <span className="eyebrow flex shrink-0 items-center gap-1.5 rounded-full border border-cobalt/30 px-2.5 py-1 text-cobalt">
            <OrbGlyph className="size-2.5" title="Priced by AI" />
            AI fair price
          </span>
        )}
      </div>

      <div className="mt-6 flex items-end justify-between border-t border-navy/10 pt-5">
        <div>
          <p className="eyebrow whitespace-nowrap text-ink-soft">Face value</p>
          <p className="tabular mt-1 font-display text-28 text-ink-soft line-through decoration-vermilion/45">
            {formatMoney(listing.face_value, listing.currency)}
          </p>
        </div>
        <div className="text-right">
          <p className="eyebrow whitespace-nowrap text-ink-soft">Asking · {discount}% off</p>
          <div className="mt-1">
            <AmountDisplay
              value={listing.asking_price}
              currency={listing.currency}
              size="md"
              tone="positive"
            />
          </div>
        </div>
      </div>

      {listing.ai_rationale && (
        <p className="mt-4 text-14 text-ink-soft">“{listing.ai_rationale}”</p>
      )}

      <div className="mt-5 flex items-center justify-between text-12 text-ink-soft">
        <span>
          {seller ? `Sold by ${seller.name}` : "Listed"} ·{" "}
          {listing.status === "sold"
            ? "Sold"
            : openDays === 0
              ? "Listed today"
              : `Open for ${openDays} ${openDays === 1 ? "day" : "days"}`}
        </span>
      </div>
    </>
  );

  const shell =
    "relative flex flex-col rounded-card border border-navy/10 bg-cream-deep/60 p-6 shadow-ink-sm";

  if (!href) return <div className={shell}>{body}</div>;

  return (
    <Link
      href={href}
      className={`${shell} transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-cobalt/30 hover:shadow-ink`}
    >
      {body}
    </Link>
  );
}
