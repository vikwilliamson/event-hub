"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerFormSchema, type RegisterFormData } from "@/lib/validations/auth.schema";
import { register as registerUser } from "@/lib/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/components/ui/field-error";
import Link from "next/link";

const FORM_ERROR_ID = "register-form-error";

export function RegisterForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerFormSchema),
  });

  function onSubmit(data: RegisterFormData) {
    startTransition(async () => {
      const response = await registerUser({
        email: data.email,
        password: data.password,
      });

      if (response.ok) {
        router.push("/organizer/dashboard");
      } else {
        setError("root", { message: response.error });
        if (response.fieldErrors) {
          for (const [field, messages] of Object.entries(response.fieldErrors)) {
            setError(field as keyof RegisterFormData, {
              message: (messages as string[])[0],
            });
          }
        }
      }
    });
  }

  return (
    <form
      className="w-full space-y-6"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <div>
        <label htmlFor="register-email" className="block text-sm font-medium text-neutral-700 mb-2">
          Email address
        </label>
        <Input
          id="register-email"
          type="email"
          placeholder="Enter your email"
          disabled={isPending}
          aria-describedby={errors.email ? "register-email-error" : undefined}
          aria-invalid={!!errors.email}
          {...register("email")}
        />
        {errors.email && (
          <FieldError id="register-email-error">{errors.email.message}</FieldError>
        )}
      </div>

      <div>
        <label htmlFor="register-password" className="block text-sm font-medium text-neutral-700 mb-2">
          Password
        </label>
        <Input
          id="register-password"
          type="password"
          placeholder="Create a password"
          disabled={isPending}
          aria-describedby={errors.password ? "register-password-error" : undefined}
          aria-invalid={!!errors.password}
          {...register("password")}
        />
        {errors.password && (
          <FieldError id="register-password-error">{errors.password.message}</FieldError>
        )}
        <p className="mt-1 text-xs text-neutral-500">
          Must be at least 8 characters with uppercase, lowercase, and number.
        </p>
      </div>

      <div>
        <label htmlFor="register-confirm-password" className="block text-sm font-medium text-neutral-700 mb-2">
          Confirm password
        </label>
        <Input
          id="register-confirm-password"
          type="password"
          placeholder="Confirm your password"
          disabled={isPending}
          aria-describedby={errors.confirmPassword ? "register-confirm-password-error" : undefined}
          aria-invalid={!!errors.confirmPassword}
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <FieldError id="register-confirm-password-error">{errors.confirmPassword.message}</FieldError>
        )}
      </div>

      {errors.root && (
        <div
          id={FORM_ERROR_ID}
          className="rounded-md bg-red-50 p-4 text-sm text-red-800"
          role="alert"
        >
          {errors.root.message}
        </div>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="w-full"
        aria-describedby={errors.root ? FORM_ERROR_ID : undefined}
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
