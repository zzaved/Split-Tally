import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Mints a short-lived WebRTC conversation token so the ElevenLabs API key
 * never reaches the browser. A public agent needs no token, so the route says
 * so and the client connects with the agent id alone.
 */
export async function GET() {
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

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`,
      { headers: { "xi-api-key": apiKey }, cache: "no-store" },
    );

    if (!response.ok) {
      return NextResponse.json({ mode: "public", agentId });
    }

    const data = (await response.json()) as { token?: string };
    if (!data.token) return NextResponse.json({ mode: "public", agentId });

    return NextResponse.json({ mode: "private", conversationToken: data.token });
  } catch {
    return NextResponse.json({ mode: "public", agentId });
  }
}
