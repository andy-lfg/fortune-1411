// /middleware.ts  (NICHT in src/, sondern im Projekt-Root!)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Session + User holen
  const { data: { session } } = await supabase.auth.getSession();
  const { data: { user } } = await supabase.auth.getUser();

  const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").toLowerCase();
  const isAdmin = !!user && (user.email || "").toLowerCase() === adminEmail;

  const url = req.nextUrl;

  // 1) Eingeloggt auf "/" → weiterleiten auf Dashboard
  if (url.pathname === "/" && session) {
    const to = url.clone();
    to.pathname = "/dashboard";
    return NextResponse.redirect(to);
  }

  // 2) Admin-Route absichern
  if (url.pathname.startsWith("/admin")) {
    if (!isAdmin) {
      const to = url.clone();
      to.pathname = "/login";
      return NextResponse.redirect(to);
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/",
    "/admin/:path*",
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api/).*)",
  ],
};
