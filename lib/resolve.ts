import { normalizeName } from "./utils";
import type { Profile } from "./types";

/**
 * The name resolution rule every voice tool shares (BUILD.MD §5.4).
 *
 *   normalise (lowercase, strip accents)
 *   match against my friends and the members of my groups, by first-name prefix
 *   exactly one match  → proceed
 *   more than one      → ask which
 *   none               → offer to add them
 *
 * Exact full-name and username matches win outright, so "Paulo Ramos" never
 * turns into a disambiguation question just because "Paulo Reis" also exists.
 */

export type Resolution =
  | { status: "one"; profile: Profile }
  | { status: "many"; candidates: Profile[] }
  | { status: "none"; query: string };

export function resolvePerson(query: string, candidates: Profile[]): Resolution {
  const q = normalizeName(query);
  if (!q) return { status: "none", query };

  const exact = candidates.filter(
    (p) => normalizeName(p.name) === q || (p.username && normalizeName(p.username) === q),
  );
  if (exact.length === 1) return { status: "one", profile: exact[0] };
  if (exact.length > 1) return { status: "many", candidates: exact };

  const byEmail = candidates.filter((p) => p.email && normalizeName(p.email) === q);
  if (byEmail.length === 1) return { status: "one", profile: byEmail[0] };

  const prefix = candidates.filter((p) => {
    const parts = normalizeName(p.name).split(/\s+/);
    return parts.some((part) => part.startsWith(q)) || normalizeName(p.name).startsWith(q);
  });

  if (prefix.length === 1) return { status: "one", profile: prefix[0] };
  if (prefix.length > 1) return { status: "many", candidates: prefix };

  return { status: "none", query };
}

/**
 * "Which Paulo — Paulo M. or Paulo R.?" — the sentence the agent speaks when
 * more than one person answers to the name.
 */
export function disambiguationQuestion(query: string, candidates: Profile[]): string {
  const labels = candidates.map((p) => distinguish(p, candidates));
  const list =
    labels.length === 2
      ? `${labels[0]} or ${labels[1]}`
      : `${labels.slice(0, -1).join(", ")}, or ${labels[labels.length - 1]}`;
  return `Which ${query} — ${list}?`;
}

/** "Paulo M." when a surname separates them, otherwise the full name. */
function distinguish(profile: Profile, all: Profile[]): string {
  const parts = profile.name.trim().split(/\s+/);
  const first = parts[0];
  const sameFirst = all.filter((p) => normalizeName(p.name.split(/\s+/)[0]) === normalizeName(first));

  if (sameFirst.length <= 1 || parts.length === 1) return profile.name;
  return `${first} ${parts[parts.length - 1][0].toUpperCase()}.`;
}
