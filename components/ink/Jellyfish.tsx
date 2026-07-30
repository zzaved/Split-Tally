import { cn } from "@/lib/utils";

/** Bell: two curved strokes and a wavy hem. */
const BELL_OUTER = "M28 104C24 46 74 16 100 16C126 16 176 46 172 104";
const BELL_HEM = "M28 104C48 118 60 92 82 106C104 120 116 92 138 106C158 118 166 96 172 104";
const BELL_INNER = "M45 98C43 57 78 33 100 33C122 33 157 57 155 98";

/** Exactly five tally-mark tentacles: four wavy uprights and a diagonal fifth. */
const TENTACLES = [
  "M58 110C50 140 64 168 54 206",
  "M79 113C71 145 85 173 75 211",
  "M100 114C92 147 106 175 96 214",
  "M121 113C113 145 127 173 117 210",
];
const TENTACLE_FIFTH = "M44 200C73 181 104 158 137 127";

/**
 * The Tally Jelly. Same ink language as the strokes — never pixel art. It
 * draws itself in, then floats: landing hero, empty states, 404, and as the
 * small glyph beside the wordmark (BUILD.MD §4).
 */
export function Jellyfish({
  size,
  className,
  animate = true,
  strokeWidth = 5,
  title,
}: {
  size?: number | string;
  className?: string;
  animate?: boolean;
  strokeWidth?: number;
  /** Give it a title when it carries meaning; otherwise it stays decorative. */
  title?: string;
}) {
  const cssSize = typeof size === "number" ? `${size}px` : size;
  const drawClass = animate ? "ink-draw ink-draw--in" : undefined;

  const strokeProps = {
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
    pathLength: 1,
  };

  return (
    <svg
      viewBox="0 0 200 240"
      fill="none"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      className={cn("select-none text-cobalt", className)}
      style={cssSize ? { width: cssSize, height: "auto" } : undefined}
    >
      <g className={animate ? "jelly-body" : undefined}>
        {/* Bell */}
        <path
          {...strokeProps}
          d={BELL_OUTER}
          strokeWidth={strokeWidth}
          strokeOpacity={0.88}
          className={drawClass}
          style={animate ? { animationDelay: "0s" } : undefined}
        />
        <path
          {...strokeProps}
          d={BELL_HEM}
          strokeWidth={strokeWidth * 0.86}
          strokeOpacity={0.8}
          className={drawClass}
          style={animate ? { animationDelay: "0.18s" } : undefined}
        />
        <path
          {...strokeProps}
          d={BELL_INNER}
          strokeWidth={strokeWidth * 0.5}
          strokeOpacity={0.42}
          className={drawClass}
          style={animate ? { animationDelay: "0.34s" } : undefined}
        />

        {/* Four uprights. The sway lives on the wrapping group so it does not
            compete with the draw-in animation on the path itself. */}
        {TENTACLES.map((d, i) => (
          <g
            key={i}
            className={cn(
              animate && "jelly-tentacle",
              animate && i > 0 && `jelly-tentacle--${i + 1}`,
            )}
          >
            <path
              {...strokeProps}
              d={d}
              strokeWidth={strokeWidth * 0.78}
              strokeOpacity={0.82}
              className={drawClass}
              style={animate ? { animationDelay: `${0.42 + i * 0.1}s` } : undefined}
            />
          </g>
        ))}

        {/* The diagonal fifth */}
        <path
          {...strokeProps}
          d={TENTACLE_FIFTH}
          strokeWidth={strokeWidth * 0.78}
          strokeOpacity={0.82}
          className={drawClass}
          style={animate ? { animationDelay: "0.86s" } : undefined}
        />
      </g>
    </svg>
  );
}

/** Tiny jelly used inline beside the wordmark and in the favicon. */
export function JellyGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 240"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={cn("text-cobalt", className)}
    >
      <g
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeWidth={12}
      >
        <path d={BELL_OUTER} />
        <path d={BELL_HEM} />
        {TENTACLES.map((d, i) => (
          <path key={i} d={d} strokeWidth={10} />
        ))}
        <path d={TENTACLE_FIFTH} strokeWidth={10} />
      </g>
    </svg>
  );
}
