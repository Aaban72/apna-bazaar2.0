
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");
  const authError = url.searchParams.get("error");
  const authErrorDescription = url.searchParams.get("error_description");
  const next = url.searchParams.get("next") || "/";

  const safeNext =
    next.startsWith("/") &&
    !next.startsWith("//") &&
    !next.includes("\\")
      ? next
      : "/";

  console.log("OAuth callback diagnostics:", {
    codeReceived: Boolean(code),
    authError,
    authErrorDescription,
    callbackPath: url.pathname,
  });

  if (authError || !code) {
    console.error("OAuth did not return an authorization code:", {
      authError,
      authErrorDescription,
      codeReceived: Boolean(code),
    });

    return NextResponse.redirect(
      new URL(
        `/login?error=oauth_callback`,
        url.origin
      )
    );
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("OAuth code exchange failed:", error.message);

    return NextResponse.redirect(
      new URL("/login?error=oauth_callback", url.origin)
    );
  }

  return NextResponse.redirect(new URL(safeNext, url.origin));
}
