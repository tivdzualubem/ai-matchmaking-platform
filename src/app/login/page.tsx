import Link from "next/link";

import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-8">
        <p className="mb-2 text-sm font-medium uppercase tracking-wider text-neutral-500">
          AI Matchmaking Platform
        </p>

        <h1 className="text-3xl font-semibold">
          Welcome back
        </h1>

        <p className="mt-2 text-neutral-600">
          Sign in to continue.
        </p>
      </div>

      <LoginForm />

      <p className="mt-6 text-sm text-neutral-600">
        New here?{" "}
        <Link
          href="/signup"
          className="font-medium text-black underline"
        >
          Create an account
        </Link>
      </p>
    </main>
  );
}
