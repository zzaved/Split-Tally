import "server-only";

import Anthropic from "@anthropic-ai/sdk";

/**
 * Every Anthropic call in the product runs through here, server-side only
 * (BUILD.MD §7). The model is pinned in one place, and callers get a clear
 * signal when the key is missing so each route can degrade in its own way
 * rather than throwing a 500 at the user.
 */

export const MODEL = "claude-sonnet-4-6";

export function hasAnthropic(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

/**
 * Models sometimes wrap JSON in prose or a code fence even when told not to.
 * Strip both defensively, then parse inside a try — a bad response becomes a
 * friendly message, never an exception in the request path.
 */
export function parseJson<T>(raw: string): T | null {
  let text = raw.trim();

  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fence) text = fence[1].trim();

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace > 0 || lastBrace < text.length - 1) {
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      text = text.slice(firstBrace, lastBrace + 1);
    }
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/** The text of the first text block, which is all any of our prompts return. */
export function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
}
