import { getAdminAuth } from "./admin";
import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "session";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

export type Session = {
  uid: string;
  email: string | undefined;
};

/**
 * Read and verify the session cookie. Returns null if missing, expired, or invalid.
 * Call from Server Components, Server Actions, or route handlers.
 */
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
  if (!sessionCookie) return null;
  try {
    const decoded = await getAdminAuth().verifySessionCookie(sessionCookie, true);
    return {
      uid: decoded.uid,
      email: decoded.email,
    };
  } catch {
    return null;
  }
}

/**
 * Cookie options for setting the session. Use in Server Action that mints the cookie.
 */
export function getSessionCookieOptions() {
  return {
    name: SESSION_COOKIE_NAME,
    maxAge: SESSION_MAX_AGE,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
  };
}
