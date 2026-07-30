import Link from "next/link";
import { cn } from "@/lib/utils";
import { JellyGlyph } from "./Jellyfish";

/**
 * The wordmark: the tally jelly glyph, then the name in the display face.
 */
export function Wordmark({
  href = "/",
  size = "md",
  className,
}: {
  href?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const text =
    size === "lg" ? "text-28" : size === "sm" ? "text-16" : "text-20";
  const glyph = size === "lg" ? "h-9" : size === "sm" ? "h-5" : "h-6";

  const inner = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <JellyGlyph className={cn(glyph, "w-auto")} />
      <span
        className={cn(
          "font-display font-semibold tracking-[0.01em] whitespace-nowrap text-navy",
          text,
        )}
      >
        Split Tally
      </span>
    </span>
  );

  if (!href) return inner;

  return (
    <Link href={href} className="inline-flex rounded-sm" aria-label="Split Tally, home">
      {inner}
    </Link>
  );
}
