"use server";

import { redirect } from "next/navigation";
import { getAdminAuth } from "@/lib/firebase/admin";
import { getSessionCookieOptions } from "@/lib/firebase/auth.server";
import { cookies } from "next/headers";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type RegisterData = z.infer<typeof registerSchema>;

/**
 * Register a new user and create a session.
 * Returns { ok: true } or { ok: false, error: string, fieldErrors?: Record<string, string[]> }.
 */
export async function register(data: RegisterData): Promise<{ ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string[]> }> {
  const parsed = registerSchema.safeParse(data);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const fieldErrors: Record<string, string[]> = {};
    for (const [key, messages] of Object.entries(flat.fieldErrors)) {
      if (Array.isArray(messages) && messages.length) fieldErrors[key] = messages;
    }
    return {
      ok: false,
      error: flat.formErrors.join(" ") || "Invalid registration data.",
      fieldErrors: Object.keys(fieldErrors).length ? fieldErrors : undefined,
    };
  }

  try {
    const adminAuth = getAdminAuth();
    const userRecord = await adminAuth.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    // Create session cookie for the new user
    const idToken = await adminAuth.createCustomToken(userRecord.uid);
    const expiresIn = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
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
    const message = err instanceof Error ? err.message : "Registration failed";
    return { ok: false, error: message };
  }
}

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
