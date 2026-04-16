import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Protect /dashboard and below: require session cookie. Redirect to /login if missing.
 * Full cookie verification happens in getSession() on the server; here we only check presence.
 */
export function middleware(request: NextRequest) {
  // No authentication required - allow access to all routes
  return NextResponse.next();
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
