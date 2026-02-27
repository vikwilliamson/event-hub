import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "session";

/**
 * Protect /dashboard and below: require session cookie. Redirect to /login if missing.
 * Full cookie verification happens in getSession() on the server; here we only check presence.
 */
export function middleware(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE_NAME);
  const isDashboard = request.nextUrl.pathname.startsWith("/dashboard");

  if (isDashboard && !session?.value) {
    const login = new URL("/login", request.url);
    login.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
