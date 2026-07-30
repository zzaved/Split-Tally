import { cn } from "@/lib/utils";
import { BAND_LABEL, scoreBand, type ScoreInput } from "@/lib/score";

const RING: Record<string, string> = {
  unproven: "text-ink-soft",
  weak: "text-vermilion",
  mixed: "text-ink-soft",
  steady: "text-cobalt",
  strong: "text-cobalt",
};

// Degrees clockwise from the top. Starting bottom-left and sweeping 270
// leaves the gap at the bottom, where the eye expects a gauge to open.
const START = 225;
const SWEEP = 270;

/**
 * An arc built from real arc commands rather than a dash pattern on a rotated
 * circle: the dash approach has to be told the circumference, and gets the
 * start angle and the cap positions wrong the moment either changes.
 */
function arcPath(cx: number, cy: number, r: number, fromDeg: number, toDeg: number): string {
  const point = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)] as const;
  };

  const [x1, y1] = point(fromDeg);
  const [x2, y2] = point(toDeg);
  const large = toDeg - fromDeg > 180 ? 1 : 0;

  return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

/**
 * The score as an open ring with the number sitting in the gap. The band name
 * lives underneath rather than inside, because at any size worth using it does
 * not fit in the middle without colliding with the stroke.
 */
export function ScoreDial({
  score,
  stats,
  size = 128,
  improving = false,
  showLabel = true,
  className,
}: {
  score: number;
  stats?: ScoreInput;
  size?: number;
  improving?: boolean;
  showLabel?: boolean;
  className?: string;
}) {
  const band = scoreBand(score, stats);
  const clamped = Math.max(0, Math.min(100, score));
  const value = START + (SWEEP * clamped) / 100;

  return (
    <span className={cn("inline-flex flex-col items-center gap-2", className)}>
      <span
        className="relative inline-flex shrink-0 items-center justify-center"
        style={{ width: size, height: size }}
        role="img"
        aria-label={`Tally Score ${score} out of 100, ${improving ? "improving" : BAND_LABEL[band]}`}
      >
        <svg viewBox="0 0 120 120" fill="none" className="absolute inset-0 size-full">
          <path
            d={arcPath(60, 60, 48, START, START + SWEEP)}
            stroke="currentColor"
            className="text-navy/10"
            strokeWidth="7"
            strokeLinecap="round"
          />
          {clamped > 0 && (
            <>
              <path
                d={arcPath(60, 60, 48, START, value)}
                stroke="currentColor"
                className={RING[band] ?? RING.mixed}
                strokeWidth="7"
                strokeLinecap="round"
                strokeOpacity="0.9"
              />
              {/* A second, lighter pass just inside it, for the painted edge. */}
              <path
                d={arcPath(60, 60, 43.5, START + 2, Math.max(START + 2, value - 3))}
                stroke="currentColor"
                className={RING[band] ?? RING.mixed}
                strokeWidth="2"
                strokeLinecap="round"
                strokeOpacity="0.3"
              />
            </>
          )}
        </svg>

        <span
          className={cn(
            "tabular relative font-display font-semibold leading-none",
            band === "weak" ? "text-vermilion" : "text-navy",
          )}
          style={{ fontSize: size * 0.32 }}
        >
          {score}
        </span>
      </span>

      {showLabel && (
        <span className="eyebrow text-center text-ink-soft">
          {improving ? "Improving" : BAND_LABEL[band]}
        </span>
      )}
    </span>
  );
}
