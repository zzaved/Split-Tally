import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * A single-use token for realtime speech to text, so the browser can open its
 * own Scribe socket without ever holding the API key. The token expires after
 * about fifteen minutes, which is far longer than any form takes to fill.
 *
 * Needs the `speech_to_text` permission on the key. Without it this returns
 * 503 and the caller falls back to the browser's own recogniser, which works
 * but cycles the microphone at every pause.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Log in again." }, { status: 401 });

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  try {
    const response = await fetch(
      "https://api.elevenlabs.io/v1/single-use-token/realtime_scribe",
      {
        method: "POST",
        headers: { "xi-api-key": apiKey, "content-type": "application/json" },
        body: "{}",
        cache: "no-store",
      },
    );

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json(
        {
          error: response.status === 401 ? "missing_permission" : "unavailable",
          detail: detail.slice(0, 200),
        },
        { status: 503 },
      );
    }

    const data = (await response.json()) as { token?: string };
    if (!data.token) return NextResponse.json({ error: "unavailable" }, { status: 503 });

    return NextResponse.json({ token: data.token });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
