"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registerFormSchema } from "@/lib/validations/auth.schema";
import { register } from "@/lib/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/components/ui/field-error";
import Link from "next/link";

const EMAIL_ID = "register-email";
const PASSWORD_ID = "register-password";
const CONFIRM_PASSWORD_ID = "register-confirm-password";
const FORM_ERROR_ID = "register-form-error";

type FieldErrors = Record<string, string[]>;

/**
 * Registration form: email, password, confirm password.
 * Client-side validation with Zod; server-side validation in register action.
 * Accessible: labels, aria-describedby, focus on first error.
 */
export function RegisterForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function getFirstErrorElement(): HTMLElement | null {
    const order = [EMAIL_ID, PASSWORD_ID, CONFIRM_PASSWORD_ID];
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
    const result = registerFormSchema.safeParse({
      email,
      password,
      confirmPassword,
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
      const response = await register({
        email: result.data.email,
        password: result.data.password,
      });

      if (response.ok) {
        router.push("/organizer/dashboard");
      } else {
        setSubmitError(response.error);
        if (response.fieldErrors) {
          setFieldErrors(response.fieldErrors);
          const firstError = getFirstErrorElement();
          firstError?.focus();
        }
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
          placeholder="Create a password"
          disabled={isPending}
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
        <p className="mt-1 text-xs text-neutral-500">
          Must be at least 8 characters with uppercase, lowercase, and number.
        </p>
      </div>

      <div>
        <label htmlFor={CONFIRM_PASSWORD_ID} className="block text-sm font-medium text-neutral-700 mb-2">
          Confirm password
        </label>
        <Input
          id={CONFIRM_PASSWORD_ID}
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm your password"
          disabled={isPending}
          aria-describedby={
            fieldErrors.confirmPassword ? `${CONFIRM_PASSWORD_ID}-error` : undefined
          }
          aria-invalid={!!fieldErrors.confirmPassword}
        />
        {fieldErrors.confirmPassword && (
          <FieldError id={`${CONFIRM_PASSWORD_ID}-error`}>
            {fieldErrors.confirmPassword[0]}
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
        {isPending ? "Creating account..." : "Create account"}
      </Button>

      <p className="text-center text-sm text-neutral-600">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-neutral-900 hover:text-neutral-700 focus-visible:outline focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 rounded"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
