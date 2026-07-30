import { NextResponse } from "next/server";
import { anthropic, hasAnthropic, MODEL, parseJson, textOf } from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES, type Category } from "@/lib/types";

/**
 * Batch categorisation (BUILD.MD §7). Anything the model returns that is not
 * one of the eleven allowed categories falls back to "Other" rather than
 * inventing a new one downstream.
 */

const PROMPT =
  "Categorize each transaction into exactly one of: Food & Drink, Groceries, Transport, Housing, " +
  "Utilities, Entertainment, Travel, Health, Shopping, Income, Other. " +
  'ONLY JSON: {"categories":[...same order...]}.';

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Log in again." }, { status: 401 });

  let descriptions: string[];
  try {
    const body = (await request.json()) as { descriptions?: unknown };
    descriptions = Array.isArray(body.descriptions)
      ? body.descriptions.map((d) => String(d)).slice(0, 100)
      : [];
  } catch {
    return NextResponse.json({ error: "Nothing to categorise." }, { status: 400 });
  }

  if (descriptions.length === 0) return NextResponse.json({ categories: [] });

  // Without a key everything stays uncategorised, which the UI shows plainly
  // and the user can fix by hand.
  if (!hasAnthropic()) {
    return NextResponse.json({ categories: descriptions.map(() => "Other" as Category) });
  }

  try {
    const message = await anthropic().messages.create({
      model: MODEL,
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: `${PROMPT}\n\nTransactions:\n${descriptions
            .map((d, i) => `${i + 1}. ${d}`)
            .join("\n")}`,
        },
      ],
    });

    const parsed = parseJson<{ categories?: string[] }>(textOf(message));
    const allowed = new Set<string>(CATEGORIES);

    const categories = descriptions.map((_, i) => {
      const value = parsed?.categories?.[i];
      return value && allowed.has(value) ? (value as Category) : ("Other" as Category);
    });

    return NextResponse.json({ categories });
  } catch {
    return NextResponse.json({ categories: descriptions.map(() => "Other" as Category) });
  }
}
