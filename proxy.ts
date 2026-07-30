import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session on every request and keeps unauthenticated
 * visitors out of the app shell.
 *
 * Next.js 16 renamed the `middleware` convention to `proxy`; the runtime is
 * Node and is not configurable.
 */
const PUBLIC_PREFIXES = ["/", "/login", "/signup", "/join", "/demo"];

function isPublic(pathname: string) {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some((p) => p !== "/" && pathname.startsWith(p));
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getUser revalidates the token with Supabase; do not replace it with
  // getSession, which trusts whatever is in the cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image files — those never need a
     * session refresh and paying for one on each would be wasteful.
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|opengraph-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
