import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow auth routes
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

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // Supabase unavailable (e.g. missing env vars) — send to login
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  if (!user) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Role-based routing
  const role = user.user_metadata?.role as string | undefined;

  if (pathname.startsWith("/admin") && role === "tourist") {
    return NextResponse.redirect(new URL("/tourist/dashboard", request.url));
  }

  if (pathname.startsWith("/tourist") && role !== "tourist") {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)",
  ],
};
