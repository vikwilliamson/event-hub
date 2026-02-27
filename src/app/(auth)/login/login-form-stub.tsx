"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/components/ui/field-error";

export function LoginFormStub() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError("Stub: wire to signIn + createSession Server Action.");
      }}
    >
      {error && (
        <FieldError id="login-error">{error}</FieldError>
      )}
      <div>
        <label htmlFor="login-email" className="block text-sm font-medium text-neutral-700">
          Email
        </label>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1"
          error={error ?? undefined}
          errorId="login-error"
        />
      </div>
      <div>
        <label htmlFor="login-password" className="block text-sm font-medium text-neutral-700">
          Password
        </label>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1"
        />
      </div>
      <Button type="submit" className="w-full">
        Log in
      </Button>
    </form>
  );
}
