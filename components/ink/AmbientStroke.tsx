"use client";

import { useEffect, useState } from "react";
import { BrushStroke, type BrushVariant } from "./BrushStroke";

/**
 * One stroke, always exactly one, painting itself somewhere behind the page
 * and then fading so the next can take its place. It is the app quietly
 * drawing in the margins — never more than a single mark on screen at a time,
 * because two would read as decoration rather than as a hand at work.
 *
 * Sits behind everything, takes no clicks, and holds still entirely under
 * prefers-reduced-motion.
 */

type Placement = { variant: BrushVariant; className: string };

/**
 * Deliberately biased away from the top-left, where the headline balance and
 * its own enclosure stroke already live — two marks in one corner would read
 * as clutter rather than as a hand at work.
 */
const PLACEMENTS: Placement[] = [
  { variant: 3, className: "top-[6%] -right-[16%] h-[520px] w-[520px]" },
  { variant: 1, className: "bottom-[16%] -left-[6%] h-[120px] w-[70vw] max-w-[700px]" },
  { variant: 5, className: "bottom-[8%] right-[4%] h-[380px] w-[380px]" },
  { variant: 6, className: "bottom-[38%] -right-[8%] h-[150px] w-[70vw] max-w-[760px]" },
  { variant: 2, className: "bottom-[28%] left-[12%] h-[90px] w-[360px]" },
  { variant: 4, className: "top-[52%] right-[14%] h-[260px] w-[420px]" },
];

/** Draw, hold, fade — then the next placement. */
const CYCLE_MS = 13000;

export function AmbientStroke() {
  const [index, setIndex] = useState(0);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (query.matches) return;

    setEnabled(true);
    const id = window.setInterval(() => setIndex((i) => i + 1), CYCLE_MS);
    return () => window.clearInterval(id);
  }, []);

  if (!enabled) return null;

  const placement = PLACEMENTS[index % PLACEMENTS.length];

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none"
    >
      {/* The key restarts both animations for each new placement. */}
      <div key={index} className={`ambient-stroke absolute ${placement.className}`}>
        <BrushStroke variant={placement.variant} className="ambient-stroke-ink h-full w-full" />
      </div>
    </div>
  );
}
