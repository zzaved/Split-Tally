import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Speaks one sample line for the voice picker. Proxied so the ElevenLabs key
 * stays on the server; the browser only ever sees audio bytes.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Log in again.", { status: 401 });

  const { searchParams } = new URL(request.url);
  const voiceId = searchParams.get("voice");
  const text = (searchParams.get("text") ?? "").slice(0, 200);

  if (!voiceId || !text) return new NextResponse("Nothing to say.", { status: 400 });

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return new NextResponse("Voice samples are not configured.", { status: 503 });

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
      {
        method: "POST",
        headers: { "xi-api-key": apiKey, "content-type": "application/json" },
        body: JSON.stringify({ text, model_id: "eleven_turbo_v2_5" }),
        cache: "no-store",
      },
    );

    if (!response.ok || !response.body) {
      return new NextResponse("That voice could not be reached.", { status: 502 });
    }

    return new NextResponse(response.body, {
      headers: { "content-type": "audio/mpeg", "cache-control": "private, max-age=3600" },
    });
  } catch {
    return new NextResponse("That voice could not be reached.", { status: 502 });
  }
}
