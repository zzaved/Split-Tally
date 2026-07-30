import "server-only";

import { round2 } from "./format";

/**
 * Currency conversion for people whose tallies are not all in one currency.
 *
 * Rates come from Frankfurter, which republishes the European Central Bank's
 * daily reference rates. No key, no account, no quota — it stays inside the
 * "only shipping tech" constraint (BUILD.MD §0).
 *
 * Converted totals are always shown next to the per-currency figures and
 * labelled with the rate date, because a converted balance is an estimate and
 * the ledger itself is not: what someone owes you is still 50 euros, whatever
 * today's rate says that is worth.
 */

const ENDPOINT = "https://api.frankfurter.dev/v1/latest";

export type Rates = {
  base: string;
  date: string;
  /** How many units of the quoted currency one unit of `base` buys. */
  rates: Record<string, number>;
};

export type Converted = {
  total: number;
  currency: string;
  /** The rate date from the ECB, or null when no conversion was possible. */
  asOf: string | null;
  /** Currencies we could not convert, so the UI can say so plainly. */
  unconverted: string[];
};

/**
 * One hour of caching is plenty: ECB publishes once a working day, and a
 * stale rate for an hour cannot mislead anyone about a reference figure.
 */
export async function getRates(base: string): Promise<Rates | null> {
  try {
    const response = await fetch(`${ENDPOINT}?base=${encodeURIComponent(base)}`, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) return null;

    const data = (await response.json()) as Partial<Rates>;
    if (!data.rates || typeof data.date !== "string") return null;

    return { base, date: data.date, rates: data.rates };
  } catch {
    // Offline, rate-limited, whatever — the caller falls back to showing the
    // per-currency figures on their own, which are always correct.
    return null;
  }
}

/**
 * Fold a set of per-currency amounts into one figure. Anything we have no rate
 * for is left out and reported, never silently dropped into the total.
 */
export async function convertTotals(
  amounts: Record<string, number>,
  target: string,
): Promise<Converted> {
  const entries = Object.entries(amounts).filter(([, value]) => Math.abs(value) > 0.005);

  if (entries.length === 0) {
    return { total: 0, currency: target, asOf: null, unconverted: [] };
  }

  const onlyTarget = entries.every(([currency]) => currency === target);
  if (onlyTarget) {
    return {
      total: round2(entries.reduce((sum, [, value]) => sum + value, 0)),
      currency: target,
      asOf: null,
      unconverted: [],
    };
  }

  const rates = await getRates(target);
  if (!rates) {
    return {
      total: round2(amounts[target] ?? 0),
      currency: target,
      asOf: null,
      unconverted: entries.map(([c]) => c).filter((c) => c !== target),
    };
  }

  let total = 0;
  const unconverted: string[] = [];

  for (const [currency, value] of entries) {
    if (currency === target) {
      total += value;
      continue;
    }
    // rates[X] is how many X one target unit buys, so we divide to come back.
    const rate = rates.rates[currency];
    if (!rate) {
      unconverted.push(currency);
      continue;
    }
    total += value / rate;
  }

  return { total: round2(total), currency: target, asOf: rates.date, unconverted };
}
