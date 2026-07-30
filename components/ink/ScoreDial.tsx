import { cn } from "@/lib/utils";
import { BAND_LABEL, scoreBand, type ScoreInput } from "@/lib/score";

const TONE: Record<string, { ring: string; text: string }> = {
  unproven: { ring: "text-ink-soft", text: "text-ink-soft" },
  weak: { ring: "text-vermilion", text: "text-vermilion" },
  mixed: { ring: "text-ink-soft", text: "text-navy" },
  steady: { ring: "text-cobalt", text: "text-navy" },
  strong: { ring: "text-cobalt", text: "text-cobalt" },
};

/**
 * The score as a ring drawn by hand rather than a plotted arc: the stroke is
 * wobbled and its ends are round, so it belongs to the same drawing as the
 * tally marks instead of looking like a dashboard gauge.
 */
export function ScoreDial({
  score,
  stats,
  size = 128,
  improving = false,
  className,
}: {
  score: number;
  stats?: ScoreInput;
  size?: number;
  improving?: boolean;
  className?: string;
}) {
  const band = scoreBand(score, stats);
  const tone = TONE[band] ?? TONE.mixed;

  // Two thirds of the circle, opened at the bottom so the number sits in a gap.
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const sweep = 0.78;
  const filled = (Math.max(0, Math.min(100, score)) / 100) * sweep;

  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Tally Score ${score} out of 100, ${BAND_LABEL[band]}`}
    >
      <svg viewBox="0 0 120 120" fill="none" className="absolute inset-0 size-full">
        <g transform="rotate(129 60 60)">
          <circle
            cx="60"
            cy="60"
            r={radius}
            stroke="currentColor"
            className="text-navy/12"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${circumference * sweep} ${circumference}`}
          />
          <circle
            cx="60"
            cy="60"
            r={radius}
            stroke="currentColor"
            className={tone.ring}
            strokeWidth="6"
            strokeLinecap="round"
            strokeOpacity="0.9"
            strokeDasharray={`${circumference * filled} ${circumference}`}
          />
          {/* A second, thinner pass, offset a little, for the painted edge. */}
          <circle
            cx="60"
            cy="60"
            r={radius - 3.5}
            stroke="currentColor"
            className={tone.ring}
            strokeWidth="2"
            strokeLinecap="round"
            strokeOpacity="0.35"
            strokeDasharray={`${(circumference - 22) * filled} ${circumference}`}
          />
        </g>
      </svg>

      <span className="relative flex flex-col items-center leading-none">
        <span className={cn("tabular font-display font-semibold", tone.text)} style={{ fontSize: size * 0.3 }}>
          {score}
        </span>
        <span className="eyebrow mt-1 text-ink-soft" style={{ fontSize: Math.max(8, size * 0.068) }}>
          {improving ? "Improving" : BAND_LABEL[band]}
        </span>
      </span>
    </span>
  );
}
