import { cn } from "@/lib/utils";

export type OrbState = "idle" | "listening" | "thinking" | "speaking";

const STATE_LABEL: Record<OrbState, string> = {
  idle: "Voice assistant, idle",
  listening: "Voice assistant, listening",
  thinking: "Voice assistant, thinking",
  speaking: "Voice assistant, speaking",
};

/**
 * The aurora sphere. Blues only — cobalt into cyan into deep violet — built
 * from layered radial and conic gradients under blur, breathing slowly. This
 * is the one place in the product where gradients are allowed (BUILD.MD §4).
 *
 * Sizes from the spec: 280 hero · 96 sheet · 64 FAB. Pass a CSS length string
 * (e.g. `clamp(200px, 46vw, 280px)`) when it needs to be fluid.
 */
export function Orb({
  size = 96,
  state = "idle",
  className,
  decorative = false,
}: {
  size?: number | string;
  state?: OrbState;
  className?: string;
  /** Hide from assistive tech when a nearby caption already says the state. */
  decorative?: boolean;
}) {
  const cssSize = typeof size === "number" ? `${size}px` : size;

  return (
    <div
      className={cn("orb", className)}
      data-state={state}
      style={{ ["--orb-size" as string]: cssSize }}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : STATE_LABEL[state]}
      aria-hidden={decorative ? true : undefined}
    >
      {state === "listening" && (
        <>
          <span className="orb-ring" />
          <span className="orb-ring orb-ring--2" />
          <span className="orb-ring orb-ring--3" />
        </>
      )}

      <div className="orb-body absolute inset-0">
        <div className="orb-shell">
          <div className="orb-aurora orb-aurora--1" />
          <div className="orb-aurora orb-aurora--2" />
          <div className="orb-aurora orb-aurora--3" />
          <div className="orb-aurora orb-aurora--4" />
        </div>
        <div className="orb-gloss" />
      </div>
    </div>
  );
}

/**
 * The small orb glyph that marks anything AI made — voice expenses, parsed
 * statement rows, AI prices. Judges have to be able to see the AI (§0).
 */
export function OrbGlyph({
  className,
  title = "Created by the assistant",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex size-3.5 shrink-0 rounded-full align-[-2px]",
        "bg-[radial-gradient(circle_at_32%_28%,var(--color-orb-cyan)_0%,var(--color-orb-cobalt)_52%,var(--color-orb-violet)_100%)]",
        className,
      )}
      role="img"
      aria-label={title}
    />
  );
}
