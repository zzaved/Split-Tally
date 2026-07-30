/**
 * Money and date formatting. All user-facing copy is English (BUILD.MD header),
 * so we format in en-US and let the currency code carry the locale flavour.
 */

const LOCALE = "en-US";

/**
 * Format an amount with its currency symbol. Cents are shown only when the
 * amount actually has them — "240" reads better than "240.00" at 72px.
 */
export function formatMoney(
  amount: number,
  currency = "USD",
  opts: { alwaysCents?: boolean; signed?: boolean } = {},
): string {
  const abs = Math.abs(amount);
  const hasCents = Math.round(abs * 100) % 100 !== 0;
  const fraction = opts.alwaysCents || hasCents ? 2 : 0;

  let out: string;
  try {
    out = new Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency,
      minimumFractionDigits: fraction,
      maximumFractionDigits: fraction,
    }).format(abs);
  } catch {
    out = `${currency} ${abs.toFixed(fraction)}`;
  }

  if (opts.signed && amount !== 0) return `${amount > 0 ? "+" : "−"}${out}`;
  return out;
}

/** Just the symbol, for input adornments. */
export function currencySymbol(currency = "USD"): string {
  try {
    const parts = new Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency,
    }).formatToParts(0);
    return parts.find((p) => p.type === "currency")?.value ?? currency;
  } catch {
    return currency;
  }
}

export const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "BRL"] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

/** "12 Mar" / "12 Mar 2025" when the year differs from today. */
export function formatDate(value: string | Date, now = new Date()): string {
  const d = typeof value === "string" ? parseDateOnly(value) : value;
  const sameYear = d.getFullYear() === now.getFullYear();
  return new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(d);
}

/** "Today" / "Yesterday" / "12 Mar" — used by the activity feed day headers. */
export function formatDayHeading(value: string | Date, now = new Date()): string {
  const d = typeof value === "string" ? parseDateOnly(value) : value;
  const days = daysBetween(d, now);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return formatDate(d, now);
}

/** "just now" / "4h ago" / "3 days ago" */
export function formatRelative(value: string | Date, now = new Date()): string {
  const d = typeof value === "string" ? new Date(value) : value;
  const minutes = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ${days === 1 ? "day" : "days"} ago`;
  return formatDate(d, now);
}

/** "March 2026" */
export function formatMonth(value: string | Date): string {
  const d = typeof value === "string" ? parseDateOnly(value) : value;
  return new Intl.DateTimeFormat(LOCALE, { month: "long", year: "numeric" }).format(d);
}

/** Parse a `YYYY-MM-DD` column without letting the timezone shift the day. */
export function parseDateOnly(value: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(value);
}

/** Whole days between two dates, ignoring time of day. */
export function daysBetween(a: Date, b: Date): number {
  const da = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const db = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.abs(Math.round((db - da) / 86400000));
}

/** `YYYY-MM-DD` in local time — what our `date` columns expect. */
export function toDateInput(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Round to cents — every split calculation funnels through this. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Split `total` into `n` shares that sum back to exactly `total`.
 * The remainder cents go to the first payers rather than vanishing.
 */
export function splitEqually(total: number, n: number): number[] {
  if (n <= 0) return [];
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / n);
  const remainder = cents - base * n;
  return Array.from({ length: n }, (_, i) => (base + (i < remainder ? 1 : 0)) / 100);
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

/**
 * The most a single entry can be.
 *
 * Not a moral judgement about spending, a data guard: a test asked the
 * assistant for a sandwich costing nine hundred and ninety nine billion and it
 * agreed, and one entry like that makes every balance, every total and every
 * score on screen unreadable. A million in any currency is far above any real
 * shared bill and far below the point where the arithmetic stops being useful.
 */
export const MAX_ENTRY = 1_000_000;
