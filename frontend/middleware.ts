import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow auth routes through without any auth check
  if (pathname.startsWith("/auth")) return NextResponse.next();

  // Dev bypass: skip all auth checks when NEXT_PUBLIC_DEV_BYPASS=true
  if (process.env.NEXT_PUBLIC_DEV_BYPASS === "true") {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Use getSession() — reads JWT from cookie with NO network round-trip.
  // This is the correct pattern for middleware; only use getUser() in
  // server components/actions where you need server-side verification.
  let session = null;
  try {
    const { data } = await supabase.auth.getSession();
    session = data.session;
  } catch {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  if (!session) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Role-based routing — read ONLY from app_metadata (server-set, not user-writable).
  // Never use user_metadata.role: it can be set by the client and cannot be trusted
  // for access control decisions.
  const role = session.user.app_metadata?.role as string | undefined;

  if (pathname.startsWith("/admin") && role === "tourist") {
    return NextResponse.redirect(new URL("/tourist/dashboard", request.url));
  }

  // Only block tourist routes for users with an explicit non-tourist role.
  // role=undefined means a new tourist who hasn't had their metadata stamped
  // yet — let them through so the login page can call updateUser first.
  if (pathname.startsWith("/tourist") && role !== undefined && role !== "tourist") {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  return response;
}

export const config = {
  // Only run middleware on actual page routes — skip static assets,
  // Next.js internals, images, and API routes to prevent unnecessary work.
  matcher: [
    "/admin/:path*",
    "/tourist/:path*",
  ],
};
