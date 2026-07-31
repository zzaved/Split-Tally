import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";

type Tone = "auto" | "positive" | "negative" | "neutral";
type Size = "sm" | "md" | "lg" | "xl" | "hero";

const SIZE_CLASS: Record<Size, string> = {
  sm: "text-20",
  md: "text-28",
  lg: "text-40",
  xl: "amount-xl",
  hero: "amount-hero",
};

const TONE_CLASS: Record<Exclude<Tone, "auto">, string> = {
  positive: "text-cobalt",
  negative: "text-vermilion",
  neutral: "text-navy",
};

/**
 * Money in the display face. Cobalt when it comes to you, vermilion when it
 * leaves. Colour is never the only signal — always pair it with a word
 * ("Owed to you", "You owe") at the call site (BUILD.MD §10).
 */
export function AmountDisplay({
  value,
  currency = "USD",
  tone = "auto",
  size = "md",
  showSign = false,
  alwaysCents = false,
  className,
}: {
  value: number;
  currency?: string;
  tone?: Tone;
  size?: Size;
  showSign?: boolean;
  alwaysCents?: boolean;
  className?: string;
}) {
  const resolved: Exclude<Tone, "auto"> =
    tone !== "auto" ? tone : value > 0 ? "positive" : value < 0 ? "negative" : "neutral";

  return (
    <span
      className={cn(
        "tabular max-w-full font-display font-semibold",
        SIZE_CLASS[size],
        TONE_CLASS[resolved],
        className,
      )}
    >
      {formatMoney(value, currency, { alwaysCents, signed: showSign })}
    </span>
  );
}
