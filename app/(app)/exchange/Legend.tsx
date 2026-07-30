import { Card } from "@/components/ink/Card";
import { TallyMarks } from "@/components/ink/TallyMarks";
import { BAND_LABEL, HIGH_MARK, LOW_MARK } from "@/lib/score";

const BANDS = [
  { key: "strong", marks: 22, from: "85 and up", meaning: "Settles quickly and has never let a tally age." },
  { key: "steady", marks: 18, from: "70 to 84", meaning: "Reliable, usually clears within a fortnight." },
  { key: "mixed", marks: 14, from: "50 to 69", meaning: "Pays, but takes their time." },
  { key: "weak", marks: 8, from: "under 50", meaning: "Has let tallies sit past a month." },
] as const;

/**
 * What the marks beside a name actually mean. A market only works if the
 * signal it prices on is legible to everyone using it, so this is stated on
 * the page rather than left to be inferred.
 */
export function Legend() {
  return (
    <Card className="p-6 md:p-8">
      <p className="eyebrow text-ink-soft">Reading a seller&rsquo;s tallies</p>

      <ul className="mt-6 flex flex-col gap-4">
        {BANDS.map((band) => (
          <li key={band.key} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <TallyMarks
              count={band.marks}
              max={25}
              size="sm"
              tone={band.key === "weak" ? "vermilion" : "soft"}
              animate={false}
            />
            <span className="text-14 text-navy">
              {BAND_LABEL[band.key]}, {band.from}
            </span>
            <span className="w-full text-12 text-ink-soft">{band.meaning}</span>
          </li>
        ))}

        <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-navy/10 pt-4">
          <span className="eyebrow rounded-full border border-navy/20 px-2 py-0.5 text-ink-soft">
            {BAND_LABEL.unproven}
          </span>
          <span className="text-14 text-navy">Nothing settled yet</span>
          <span className="w-full text-12 text-ink-soft">
            Their 50 is the number everyone starts on, not a measurement. An absence of information,
            not a bad result.
          </span>
        </li>

        <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="eyebrow rounded-full border border-cobalt/40 bg-cobalt/6 px-2 py-0.5 text-cobalt">
            Improving
          </span>
          <span className="text-14 text-navy">Was reliable, fell, and has said so</span>
          <span className="w-full text-12 text-ink-soft">
            Only available to someone whose record already reached {HIGH_MARK} and has since dropped
            below {LOW_MARK}. It cannot be claimed by a new account or by anyone who has never
            settled on time, and it is spent once: it returns only if the record climbs back to{" "}
            {HIGH_MARK} and falls again. It does not raise the score or soften anything the numbers
            say. It tells you the drop is recent rather than the whole story.
          </span>
        </li>
      </ul>
    </Card>
  );
}
