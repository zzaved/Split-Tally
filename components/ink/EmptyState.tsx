import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { BrushStroke, type BrushVariant } from "./BrushStroke";
import { Jellyfish } from "./Jellyfish";

/**
 * Every list in the product has one of these: an illustration, one inviting
 * sentence, and exactly one action (BUILD.MD §4).
 */
export function EmptyState({
  illustration = "jelly",
  variant = 1,
  title,
  copy,
  action,
  className,
}: {
  illustration?: "jelly" | "strokes" | "none";
  variant?: BrushVariant;
  title: string;
  copy: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 px-6 py-16 text-center",
        className,
      )}
    >
      {illustration === "jelly" && (
        <Jellyfish size={96} className="mb-2 opacity-70" strokeWidth={6} />
      )}
      {illustration === "strokes" && (
        <BrushStroke variant={variant} className="mb-2 h-12 w-40 opacity-45" />
      )}

      <h3 className="font-display text-28 font-medium text-navy">{title}</h3>
      <p className="max-w-md text-14 text-ink-soft">{copy}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
