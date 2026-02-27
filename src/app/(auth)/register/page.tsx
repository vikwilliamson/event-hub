import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <div className="w-full rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-bold text-neutral-900 mb-2">Sign up</h1>
      <p className="text-sm text-neutral-600 mb-6">
        Create an organizer account with email and password.
      </p>
      <RegisterForm />
    </div>
  );
}
