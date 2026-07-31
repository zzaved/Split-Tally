import { cn } from "@/lib/utils";

/**
 * The way out of the app and into the documentation.
 *
 * A judge who opens the live link has no other route to the written case: the
 * repository is one hop further away and nothing on screen points at it. It
 * opens in a new tab because leaving the ledger to read about the ledger is
 * not what anybody wants.
 */
export const DOCS_URL = "https://zzaved.github.io/Split-Tally/";

export function DocsLink({ className }: { className?: string }) {
  return (
    <a
      href={DOCS_URL}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "hidden items-center gap-1.5 rounded-full px-3 py-2 text-14 text-ink-soft",
        "transition-colors duration-150 hover:bg-navy/5 hover:text-navy sm:inline-flex",
        className,
      )}
    >
      Documentation
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="size-3.5 shrink-0"
        stroke="currentColor"
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M13.5 6.2h4.3v4.3" />
        <path d="M17.4 6.6 10.6 13.4" />
        <path d="M15.6 14.4v3.4c0 .6-.5 1-1 1H6.2c-.6 0-1-.4-1-1V9.4c0-.5.4-1 1-1h3.4" />
      </svg>
    </a>
  );
}
