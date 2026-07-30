"use client";

import { cn } from "@/lib/utils";

/**
 * Shortcuts for the answer you were about to give anyway. They sit lighter
 * than the composer on purpose: tapping one is the same as typing it, so they
 * should read as a convenience rather than as the main way to reply.
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
      {options.map((option) => (
        <button
          key={option}
          type="button"
          disabled={disabled}
          onClick={() => onPick(option)}
          className="rounded-full bg-navy/6 px-3 py-1.5 text-12 text-ink-soft transition-colors duration-150 hover:bg-cobalt/10 hover:text-cobalt disabled:opacity-45"
        >
          {option}
        </button>
      ))}
    </div>
  );
}
