"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/firebase/auth.client";
import { createSession } from "@/lib/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/components/ui/field-error";
import Link from "next/link";
import { z } from "zod";

const loginFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const EMAIL_ID = "login-email";
const PASSWORD_ID = "login-password";
const FORM_ERROR_ID = "login-form-error";

type FieldErrors = Record<string, string[]>;

/**
 * Login form: email, password.
 * Client-side validation with Zod; client-side Firebase auth; server-side session creation.
 * Accessible: labels, aria-describedby, focus on first error.
 */
export function LoginForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function getFirstErrorElement(): HTMLElement | null {
    const order = [EMAIL_ID, PASSWORD_ID];
    for (const id of order) {
      const el = document.getElementById(id);
      if (el) return el;
    }
    return null;
  }

  function handleSubmit() {
    setSubmitError(null);
    setFieldErrors({});

    // Client-side validation
    const result = loginFormSchema.safeParse({
      email,
      password,
    });

    if (!result.success) {
      const flat = result.error.flatten();
      const errors: FieldErrors = {};
      for (const [key, messages] of Object.entries(flat.fieldErrors)) {
        if (Array.isArray(messages) && messages.length) {
          errors[key] = messages;
        }
      }
      setFieldErrors(errors);
      setSubmitError(flat.formErrors.join(" ") || "Please fix the errors below.");
      
      // Focus first error field
      const firstError = getFirstErrorElement();
      firstError?.focus();
      return;
    }

    startTransition(async () => {
      try {
        // Sign in with Firebase client
        const userCredential = await signIn(result.data.email, result.data.password);
        const idToken = await userCredential.user.getIdToken();

        // Create server-side session
        const sessionResponse = await createSession(idToken);

        if (sessionResponse.ok) {
          router.push("/organizer/dashboard");
        } else {
          setSubmitError(sessionResponse.error);
          const firstError = getFirstErrorElement();
          firstError?.focus();
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Login failed";
        setSubmitError(message);
        const firstError = getFirstErrorElement();
        firstError?.focus();
      }
    });
  }

  return (
    <form
      className="w-full space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      noValidate
    >
      <div>
        <label htmlFor={EMAIL_ID} className="block text-sm font-medium text-neutral-700 mb-2">
          Email address
        </label>
        <Input
          id={EMAIL_ID}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          disabled={isPending}
          autoComplete="email"
          aria-describedby={
            fieldErrors.email ? `${EMAIL_ID}-error` : undefined
          }
          aria-invalid={!!fieldErrors.email}
        />
        {fieldErrors.email && (
          <FieldError id={`${EMAIL_ID}-error`}>
            {fieldErrors.email[0]}
          </FieldError>
        )}
      </div>

      <div>
        <label htmlFor={PASSWORD_ID} className="block text-sm font-medium text-neutral-700 mb-2">
          Password
        </label>
        <Input
          id={PASSWORD_ID}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          disabled={isPending}
          autoComplete="current-password"
          aria-describedby={
            fieldErrors.password ? `${PASSWORD_ID}-error` : undefined
          }
          aria-invalid={!!fieldErrors.password}
        />
        {fieldErrors.password && (
          <FieldError id={`${PASSWORD_ID}-error`}>
            {fieldErrors.password[0]}
          </FieldError>
        )}
      </div>

      {submitError && (
        <div
          id={FORM_ERROR_ID}
          className="rounded-md bg-red-50 p-4 text-sm text-red-800"
          role="alert"
        >
          {submitError}
        </div>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="w-full"
        aria-describedby={submitError ? FORM_ERROR_ID : undefined}
      >
        {isPending ? "Signing in..." : "Log in"}
      </Button>

      <p className="text-center text-sm text-neutral-600">
        Don't have an account?{" "}
        <Link
          href="/register"
          className="font-medium text-neutral-900 hover:text-neutral-700 focus-visible:outline focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 rounded"
        >
          Sign up
        </Link>
      </p>
    </form>
  );
}
