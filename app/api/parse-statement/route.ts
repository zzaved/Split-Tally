import { NextResponse } from "next/server";
import { anthropic, hasAnthropic, MODEL, parseJson, textOf } from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";
import type { ParsedTransaction } from "@/lib/types";

/**
 * Statement snap (BUILD.MD §5.6, §7). The image lives in a private bucket, so
 * the route mints a short-lived signed URL, reads the bytes itself, and sends
 * them to Anthropic — the model never gets a URL into our storage.
 */

const PROMPT =
  "This is a screenshot of a bank statement or banking app. Extract every visible transaction. " +
  'Respond with ONLY valid JSON, no prose, no code fences: {"transactions":[{"date":"YYYY-MM-DD","description":string,"amount":number,"direction":"in"|"out"}]}. ' +
  "If the year is not visible assume the current year. " +
  'If you cannot read the image, respond {"transactions":[]}.';

const UNREADABLE = "Couldn't read this one, try a clearer screenshot.";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Log in again to read a statement." }, { status: 401 });
  }

  if (!hasAnthropic()) {
    return NextResponse.json(
      { error: "Statement reading is not switched on: ANTHROPIC_API_KEY is missing." },
      { status: 503 },
    );
  }

  let path: string;
  try {
    const body = (await request.json()) as { path?: string };
    path = String(body.path ?? "");
  } catch {
    return NextResponse.json({ error: UNREADABLE }, { status: 400 });
  }

  // The path must sit inside this user's own folder.
  if (!path || !path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "That file is not yours." }, { status: 403 });
  }

  const { data: signed, error: signError } = await supabase.storage
    .from("statements")
    .createSignedUrl(path, 60);

  if (signError || !signed?.signedUrl) {
    return NextResponse.json({ error: UNREADABLE }, { status: 400 });
  }

  let base64: string;
  let mediaType: "image/jpeg" | "image/png" | "image/webp";

  try {
    const response = await fetch(signed.signedUrl);
    if (!response.ok) throw new Error("download failed");

    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    mediaType = contentType.includes("png")
      ? "image/png"
      : contentType.includes("webp")
        ? "image/webp"
        : "image/jpeg";

    base64 = Buffer.from(await response.arrayBuffer()).toString("base64");
  } catch {
    return NextResponse.json({ error: UNREADABLE }, { status: 400 });
  }

  try {
    const message = await anthropic().messages.create({
      model: MODEL,
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    });

    const parsed = parseJson<{ transactions?: ParsedTransaction[] }>(textOf(message));
    if (!parsed?.transactions) {
      return NextResponse.json({ error: UNREADABLE }, { status: 422 });
    }

    // Normalise before the review table ever sees it.
    const transactions = parsed.transactions
      .filter((t) => t && typeof t.description === "string" && Number.isFinite(Number(t.amount)))
      .map((t) => ({
        date: /^\d{4}-\d{2}-\d{2}$/.test(String(t.date))
          ? String(t.date)
          : new Date().toISOString().slice(0, 10),
        description: String(t.description).trim().slice(0, 140),
        amount: Math.abs(Number(t.amount)),
        direction: t.direction === "in" ? ("in" as const) : ("out" as const),
      }))
      .filter((t) => t.amount > 0);

    return NextResponse.json({ transactions });
  } catch {
    return NextResponse.json({ error: UNREADABLE }, { status: 502 });
  }
}
