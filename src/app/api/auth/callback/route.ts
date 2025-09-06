import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { event, session } = await req.json().catch(() => ({ event: null, session: null }));

  if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
    // komplette Session an Helpers übergeben → setzt Cookies korrekt
    await supabase.auth.setSession(session);
  }
  if (event === "SIGNED_OUT") {
    await supabase.auth.signOut();
  }

  return NextResponse.json({ ok: true });
}

// Optional (PKCE/OAuth): tauscht ?code in Session
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    await supabase.auth.exchangeCodeForSession(code);
  }
  const redirectTo = url.searchParams.get("redirect_to") || "/";
  return NextResponse.redirect(redirectTo, { status: 303 });
}
