import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="w-full rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-bold text-neutral-900 mb-2">Log in</h1>
      <p className="text-sm text-neutral-600 mb-6">
        Sign in with your organizer account.
      </p>
      <LoginForm />
    </div>
  );
}
