import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** The default surface: cream-deep on cream, one hairline, almost no shadow. */
export function Card({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "li";
}) {
  return (
    <Tag
      className={cn(
        "rounded-card border border-navy/10 bg-cream-deep/70 shadow-ink-sm",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/** Eyebrow + optional action, used above every card list and section. */
export function SectionHeading({
  eyebrow,
  title,
  action,
  className,
}: {
  eyebrow?: string;
  title?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow text-ink-soft">{eyebrow}</p>}
        {title && (
          <h2 className="mt-2 font-display text-28 font-medium text-navy md:text-40">{title}</h2>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** A cream circle with initials — how people appear everywhere in the ledger. */
export function Avatar({
  name,
  size = 32,
  managed = false,
  className,
}: {
  name: string;
  size?: number;
  /** Managed friends are not on Split Tally yet — drawn with a dashed edge. */
  managed?: boolean;
  className?: string;
}) {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-cream text-navy",
        managed ? "border border-dashed border-cobalt/45" : "border border-navy/12",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.36)) }}
      aria-hidden="true"
    >
      <span className="font-sans font-medium tracking-[0.04em]">{letters || "?"}</span>
    </span>
  );
}
