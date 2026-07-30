import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Our type scale is numeric (text-11 … text-72), which tailwind-merge would
 * otherwise read as a colour — and then drop `text-cream` from a class list
 * that also carries `text-12`. Teaching it the scale keeps size and colour
 * independent.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["11", "12", "14", "16", "20", "28", "40", "56", "72"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Deterministic small hash — used to pick a BrushStroke variant or an avatar
 * tone from an id, so the same group always paints the same stroke.
 */
export function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Pick 1..6 deterministically from an id. */
export function strokeVariantFor(id: string): 1 | 2 | 3 | 4 | 5 | 6 {
  return ((hashString(id) % 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6;
}

/**
 * Group covers only ever use the three wide horizontal strokes. The arc and
 * the enclosure need room and would collide with the card's own content.
 */
export function coverVariantFor(id: string): 1 | 2 | 6 {
  return ([1, 2, 6] as const)[hashString(id) % 3];
}

/** "Ana Beatriz" -> "AB", "paulo" -> "P" */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** First name only — the agent and the UI both speak in first names. */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

/** lowercase, accents stripped — the basis of the name resolution rule (§5.4). */
export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
