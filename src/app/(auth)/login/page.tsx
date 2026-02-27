import { LoginFormStub } from "./login-form-stub";

export default function LoginPage() {
  return (
    <div className="w-full rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-bold text-neutral-900">Log in</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Sign in with your organizer account.
      </p>
      <LoginFormStub />
    </div>
  );
}
