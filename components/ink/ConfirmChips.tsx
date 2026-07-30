"use client";

import { cn } from "@/lib/utils";

/**
 * "Yes" / "Fix that" — clicking one sends that text into the same conversation
 * the microphone feeds, so confirming by tap and confirming by voice are the
 * same act (BUILD.MD §4).
 */
export function ConfirmChips({
  onPick,
  disabled,
  options = ["Yes", "Fix that"],
  className,
}: {
  onPick: (text: string) => void;
  disabled?: boolean;
  options?: string[];
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option, i) => (
        <button
          key={option}
          type="button"
          disabled={disabled}
          onClick={() => onPick(option)}
          className={cn(
            "rounded-full border px-4 py-2 text-14 transition-colors duration-150 disabled:opacity-45",
            i === 0
              ? "border-cobalt bg-cobalt text-cream hover:bg-navy hover:border-navy"
              : "border-navy/20 text-navy hover:border-cobalt hover:text-cobalt",
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
