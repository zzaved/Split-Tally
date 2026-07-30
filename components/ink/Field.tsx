import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

const CONTROL =
  "w-full rounded-well border border-navy/15 bg-cream px-3.5 py-2.5 text-16 text-navy " +
  "placeholder:text-ink-soft/70 transition-colors duration-150 " +
  "hover:border-navy/25 focus:border-cobalt focus:outline-none focus:ring-2 focus:ring-cobalt/25 " +
  "disabled:opacity-50";

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={htmlFor} className="eyebrow text-ink-soft">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-12 text-ink-soft">{hint}</p>}
      {error && (
        <p className="text-12 text-vermilion" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(CONTROL, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(CONTROL, "min-h-24 resize-y", className)} {...props} />;
}

/** A chevron drawn in the same ink language, so a select never reads as a text field. */
const CHEVRON =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none'><path d='M3.5 6.2C5 7.6 6.6 9 8 10.2C9.4 9 11 7.6 12.5 6.2' stroke='%235A679E' stroke-width='1.5' stroke-linecap='round'/></svg>\")";

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(CONTROL, "cursor-pointer appearance-none bg-no-repeat pr-10", className)}
      style={{
        backgroundImage: CHEVRON,
        backgroundPosition: "right 0.875rem center",
        backgroundSize: "1rem 1rem",
      }}
      {...props}
    >
      {children}
    </select>
  );
}

/** Amount input with the currency symbol set into the field. */
export function MoneyInput({
  symbol,
  className,
  ...props
}: ComponentProps<"input"> & { symbol: string }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 font-display text-20 text-ink-soft">
        {symbol}
      </span>
      <input
        inputMode="decimal"
        className={cn(CONTROL, "tabular pl-11 font-display text-20", className)}
        {...props}
      />
    </div>
  );
}

/** A form-level message: calm, explains, and says what to do next. */
export function FormMessage({
  tone = "error",
  children,
}: {
  tone?: "error" | "notice";
  children: ReactNode;
}) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-well border px-3.5 py-3 text-14",
        tone === "error"
          ? "border-vermilion/30 bg-vermilion/6 text-vermilion"
          : "border-cobalt/25 bg-cobalt/5 text-navy",
      )}
    >
      {children}
    </p>
  );
}
