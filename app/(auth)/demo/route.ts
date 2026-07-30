import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * "Explore the demo" from the landing page: one click straight into Ana's
 * seeded account (BUILD.MD §5.1). On failure it hands the visitor to /login
 * with an explanation rather than a blank screen.
 */
export async function GET(request: NextRequest) {
  const email = process.env.DEMO_EMAIL;
  const password = process.env.DEMO_PASSWORD;
  const origin = request.nextUrl.origin;

  if (!email || !password) {
    return NextResponse.redirect(`${origin}/login?demo=unconfigured`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.redirect(`${origin}/login?demo=missing`);
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
