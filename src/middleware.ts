import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const DEMO_UID_COOKIE = "eh_uid";
const ONE_YEAR = 365 * 24 * 60 * 60;

/**
 * Demo identity: every visitor gets a stable anonymous uid cookie on first
 * request. No login, no route guards — the uid scopes "my events" and
 * "my RSVPs" per browser.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  if (!request.cookies.get(DEMO_UID_COOKIE)) {
    response.cookies.set(DEMO_UID_COOKIE, crypto.randomUUID(), {
      maxAge: ONE_YEAR,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
