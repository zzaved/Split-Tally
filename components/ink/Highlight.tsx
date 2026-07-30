"use client";

import { useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A ring drawn around whatever the orb is filling in, in the same hand as the
 * rest of the drawing: an imperfect loop, round caps, displaced by turbulence
 * so no two sides are quite parallel. It circles the field the way you would
 * ring something on paper, rather than boxing it the way software does.
 *
 * Anchored to a live element, so it follows scrolling and resizing.
 */
export function Highlight({
  target,
  seed = 0,
  className,
}: {
  target: HTMLElement | null;
  /** Varies the wobble so consecutive fields are not ringed identically. */
  seed?: number;
  className?: string;
}) {
  const filterId = useId().replace(/:/g, "");
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!target) {
      setRect(null);
      return;
    }

    const measure = () => setRect(target.getBoundingClientRect());
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(target);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [target]);

  if (!rect) return null;

  const pad = 10;
  const w = rect.width + pad * 2;
  const h = rect.height + pad * 2;

  // A loop that overshoots where it closes, the way a pen does.
  const wobble = (n: number) => ((seed * 7 + n * 13) % 5) - 2;
  const r = Math.min(18, h / 2);

  const d = [
    `M${r + wobble(1)} ${1 + wobble(2)}`,
    `H${w - r + wobble(3)}`,
    `A${r} ${r} 0 0 1 ${w - 1} ${r + wobble(4)}`,
    `V${h - r + wobble(5)}`,
    `A${r} ${r} 0 0 1 ${w - r + wobble(6)} ${h - 1}`,
    `H${r + wobble(7)}`,
    `A${r} ${r} 0 0 1 1 ${h - r + wobble(8)}`,
    `V${r + wobble(2)}`,
    `A${r} ${r} 0 0 1 ${r + wobble(1)} ${1 + wobble(2)}`,
    // the overshoot
    `L${r + 24 + wobble(4)} ${2 + wobble(5)}`,
  ].join(" ");

  return (
    <svg
      aria-hidden="true"
      className={cn("pointer-events-none fixed z-[60]", className)}
      style={{ left: rect.left - pad, top: rect.top - pad, width: w, height: h }}
      viewBox={`0 0 ${w} ${h}`}
      fill="none"
    >
      <defs>
        <filter id={filterId} x="-8%" y="-20%" width="116%" height="140%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.03"
            numOctaves="3"
            seed={seed * 11 + 3}
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="2.6"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>

      <g filter={`url(#${filterId})`} className="text-cobalt">
        <path
          d={d}
          pathLength={1}
          stroke="currentColor"
          strokeWidth={3}
          strokeOpacity={0.85}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="ink-draw ink-draw--in"
        />
        <path
          d={d}
          pathLength={1}
          stroke="currentColor"
          strokeWidth={1.4}
          strokeOpacity={0.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="ink-draw ink-draw--in"
          style={{ animationDelay: "0.1s" }}
          transform="translate(1.5 1.5)"
        />
      </g>
    </svg>
  );
}
