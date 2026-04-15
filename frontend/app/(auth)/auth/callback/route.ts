import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Only trust app_metadata.role — it is set server-side via the Admin API
      // and cannot be overwritten by the client. user_metadata is user-writable
      // and must NOT be used for routing decisions.
      const role = data.user.app_metadata?.role as string | undefined;

      if (role === "admin" || role === "authority" || role === "responder") {
        return NextResponse.redirect(`${origin}/admin/dashboard`);
      }
      // Default: tourist (includes no-role Google OAuth users)
      return NextResponse.redirect(`${origin}/tourist/dashboard`);
    }
  }

  // Something went wrong — back to login
  return NextResponse.redirect(`${origin}/auth/login?error=oauth_failed`);
}
