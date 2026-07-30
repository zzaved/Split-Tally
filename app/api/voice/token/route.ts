import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Opens a session without the ElevenLabs key ever reaching the browser.
 *
 * Two transports, because they are genuinely different jobs:
 *
 *   voice → WebRTC, using a short-lived conversation token
 *   text  → WebSocket, using a signed URL
 *
 * Text mode over WebRTC technically connects but then sits on an audio
 * transport it never uses, and the room drops. A typed conversation should not
 * need a microphone or a media pipeline at all.
 *
 * A public agent needs neither, so the route says so and the client connects
 * with the agent id alone.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Log in again to talk." }, { status: 401 });
  }

  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
  if (!agentId) {
    return NextResponse.json(
      { error: "not_configured", detail: "NEXT_PUBLIC_ELEVENLABS_AGENT_ID is missing." },
      { status: 503 },
    );
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    // Public agent: the browser can open the session with the id on its own.
    return NextResponse.json({ mode: "public", agentId });
  }

  const wantsText = new URL(request.url).searchParams.get("transport") === "text";

  const endpoint = wantsText
    ? `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`
    : `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`;

  try {
    const response = await fetch(endpoint, {
      headers: { "xi-api-key": apiKey },
      cache: "no-store",
    });

    if (!response.ok) return NextResponse.json({ mode: "public", agentId });

    const data = (await response.json()) as { token?: string; signed_url?: string };

    if (wantsText) {
      if (!data.signed_url) return NextResponse.json({ mode: "public", agentId });
      return NextResponse.json({ mode: "private", transport: "websocket", signedUrl: data.signed_url });
    }

    if (!data.token) return NextResponse.json({ mode: "public", agentId });
    return NextResponse.json({ mode: "private", transport: "webrtc", conversationToken: data.token });
  } catch {
    return NextResponse.json({ mode: "public", agentId });
  }
}
