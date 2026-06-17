"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "@/lib/firebase/auth.client";
import { createSession } from "@/lib/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/components/ui/field-error";
import Link from "next/link";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFields = z.infer<typeof loginSchema>;

const FORM_ERROR_ID = "login-form-error";

export function LoginForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFields>({
    resolver: zodResolver(loginSchema),
  });

  function onSubmit(data: LoginFields) {
    startTransition(async () => {
      try {
        const userCredential = await signIn(data.email, data.password);
        const idToken = await userCredential.user.getIdToken();
        const sessionResponse = await createSession(idToken);

        if (sessionResponse.ok) {
          router.push("/dashboard");
        } else {
          setError("root", { message: sessionResponse.error });
        }
      } catch (err) {
        setError("root", {
          message: err instanceof Error ? err.message : "Login failed",
        });
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
        <label htmlFor="login-email" className="block text-sm font-medium text-neutral-700 mb-2">
          Email address
        </label>
        <Input
          id="login-email"
          type="email"
          placeholder="Enter your email"
          disabled={isPending}
          autoComplete="email"
          aria-describedby={errors.email ? "login-email-error" : undefined}
          aria-invalid={!!errors.email}
          {...register("email")}
        />
        {errors.email && (
          <FieldError id="login-email-error">{errors.email.message}</FieldError>
        )}
      </div>

      <div>
        <label htmlFor="login-password" className="block text-sm font-medium text-neutral-700 mb-2">
          Password
        </label>
        <Input
          id="login-password"
          type="password"
          placeholder="Enter your password"
          disabled={isPending}
          autoComplete="current-password"
          aria-describedby={errors.password ? "login-password-error" : undefined}
          aria-invalid={!!errors.password}
          {...register("password")}
        />
        {errors.password && (
          <FieldError id="login-password-error">{errors.password.message}</FieldError>
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
        {isPending ? "Signing in..." : "Log in"}
      </Button>

      <p className="text-center text-sm text-neutral-600">
        Don&apos;t have an account?{" "}
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
