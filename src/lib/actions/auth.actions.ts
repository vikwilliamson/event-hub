"use server";

import { redirect } from "next/navigation";
import { getAdminAuth } from "@/lib/firebase/admin";
import { getSessionCookieOptions } from "@/lib/firebase/auth.server";
import { cookies } from "next/headers";

/**
 * Mint a session cookie from a Firebase ID token. Call after client sign-in.
 * Returns { ok: true } or { ok: false, error: string }.
 */
export async function createSession(idToken: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const adminAuth = getAdminAuth();
    const expiresIn = 7 * 24 * 60 * 60 * 1000; // 7 days in ms for createSessionCookie (seconds)
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn: 7 * 24 * 60 * 60 });
    const opts = getSessionCookieOptions();
    const store = await cookies();
    store.set(opts.name, sessionCookie, {
      maxAge: opts.maxAge,
      httpOnly: opts.httpOnly,
      secure: opts.secure,
      sameSite: opts.sameSite,
      path: opts.path,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create session";
    return { ok: false, error: message };
  }
}

/**
 * Sign out: revoke refresh tokens and clear the session cookie. Redirects to /login.
 */
export async function signOut(): Promise<never> {
  try {
    const { getSession } = await import("@/lib/firebase/auth.server");
    const session = await getSession();
    if (session?.uid) {
      await getAdminAuth().revokeRefreshTokens(session.uid);
    }
    const opts = getSessionCookieOptions();
    const store = await cookies();
    store.delete(opts.name);
  } catch {
    // Still redirect so user is not stuck
  }
  redirect("/login");
}
