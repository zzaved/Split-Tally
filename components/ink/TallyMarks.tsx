"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useInView } from "./useInView";

type Tone = "cobalt" | "navy" | "soft" | "vermilion";
type Size = "sm" | "md" | "lg";

const TONE_CLASS: Record<Tone, string> = {
  cobalt: "text-cobalt",
  navy: "text-navy",
  soft: "text-ink-soft",
  vermilion: "text-vermilion",
};

const HEIGHT: Record<Size, number> = { sm: 14, md: 20, lg: 28 };
const STROKE: Record<Size, number> = { sm: 2.2, md: 2, lg: 1.8 };

/** Cell geometry: four uprights and a diagonal fifth, drawn by hand. */
const CELL_W = 28;
const CELL_H = 24;
const UPRIGHT_X = [3, 9, 15, 21];
const DIAGONAL = "M1.5 20.5C8 17 18 10 26.5 4";

/** Three wobbles, cycled so no two neighbouring marks are identical. */
function upright(x: number, wobble: number): string {
  switch (wobble) {
    case 1:
      return `M${x} 3C${x + 1} 9 ${x - 1} 15 ${x + 0.5} 21`;
    case 2:
      return `M${x + 0.4} 3.5C${x - 0.5} 10 ${x + 0.6} 14 ${x - 0.4} 20.6`;
    default:
      return `M${x} 3C${x - 1} 9 ${x + 1} 15 ${x} 21`;
  }
}

function Group({
  filled,
  ghosts,
  strokeWidth,
  animate,
  startIndex,
}: {
  /** How many of the five marks are inked (0–5). */
  filled: number;
  /** How many of the remaining marks are drawn as faint placeholders. */
  ghosts: number;
  strokeWidth: number;
  animate: boolean;
  startIndex: number;
}) {
  const marks = [];

  for (let i = 0; i < 5; i++) {
    const isFilled = i < filled;
    const isGhost = !isFilled && i < filled + ghosts;
    if (!isFilled && !isGhost) continue;

    const d = i === 4 ? DIAGONAL : upright(UPRIGHT_X[i], (startIndex + i) % 3);

    marks.push(
      <path
        key={i}
        d={d}
        pathLength={1}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeOpacity={isGhost ? 0.16 : i === 4 ? 0.92 : 0.88}
        className={cn(animate && isFilled && "tally-mark")}
        style={animate && isFilled ? { animationDelay: `${(startIndex + i) * 0.075}s` } : undefined}
      />,
    );
  }

  return (
    <svg
      viewBox={`0 0 ${CELL_W} ${CELL_H}`}
      fill="none"
      aria-hidden="true"
      focusable="false"
      className="h-full w-auto shrink-0"
    >
      {marks}
    </svg>
  );
}

export function TallyMarks({
  count,
  max,
  size = "md",
  tone = "cobalt",
  animate = true,
  label,
  maxGroups = 5,
  className,
}: {
  /** Inked marks. */
  count: number;
  /** Total capacity — the difference is drawn as faint placeholders. */
  max?: number;
  size?: Size;
  tone?: Tone;
  animate?: boolean;
  /** Screen-reader text. Without it the marks are decorative. */
  label?: string;
  /** Beyond this many groups we stop drawing and print a remainder instead. */
  maxGroups?: number;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLSpanElement>();

  const safeCount = Math.max(0, Math.floor(count));
  const total = Math.max(safeCount, Math.floor(max ?? safeCount));
  const capacity = maxGroups * 5;

  const shownTotal = Math.min(total, capacity);
  const shownFilled = Math.min(safeCount, capacity);
  const overflow = safeCount - shownFilled;

  const groups = Math.ceil(shownTotal / 5) || (safeCount === 0 && max ? 1 : 0);
  const cells = [];

  for (let g = 0; g < groups; g++) {
    const base = g * 5;
    cells.push(
      <Group
        key={g}
        startIndex={base}
        filled={Math.min(5, Math.max(0, shownFilled - base))}
        ghosts={Math.min(5, Math.max(0, shownTotal - base)) - Math.min(5, Math.max(0, shownFilled - base))}
        strokeWidth={STROKE[size]}
        animate={animate && inView}
      />,
    );
  }

  return (
    <span
      ref={ref}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        "inline-flex items-end gap-1.5",
        TONE_CLASS[tone],
        !animate && "tally-static",
        className,
      )}
      style={{ height: HEIGHT[size] }}
    >
      {cells}
      {overflow > 0 && (
        <span className="eyebrow self-center pl-0.5 text-ink-soft">+{overflow}</span>
      )}
    </span>
  );
}

/**
 * The loading state for anything that takes a beat: marks draw one by one,
 * then the group clears and starts again. Never a spinner (BUILD.MD §10).
 */
export function TallyLoader({
  lines,
  size = "md",
  className,
}: {
  /** Rotating status lines, e.g. "Reading your statement…". */
  lines?: string[];
  size?: Size;
  className?: string;
}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 420);
    return () => window.clearInterval(id);
  }, []);

  const filled = (tick % 6) + 1;
  const lineIndex = lines?.length ? Math.floor(tick / 7) % lines.length : 0;

  return (
    <div className={cn("flex flex-col items-center gap-4 text-center", className)} role="status">
      <TallyMarks count={Math.min(filled, 5)} max={5} size={size} animate={false} />
      {lines?.length ? (
        <p className="text-14 text-ink-soft">{lines[lineIndex]}</p>
      ) : (
        <span className="sr-only">Loading</span>
      )}
    </div>
  );
}
