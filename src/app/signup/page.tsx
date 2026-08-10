import Link from "next/link";

import { SignUpForm } from "@/features/auth/components/signup-form";

export default function SignUpPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-8">
        <p className="mb-2 text-sm font-medium uppercase tracking-wider text-neutral-500">
          AI Matchmaking Platform
        </p>

        <h1 className="text-3xl font-semibold">
          Create your account
        </h1>

        <p className="mt-2 text-neutral-600">
          Join to discover compatible people and social events.
        </p>
      </div>

      <SignUpForm />

      <p className="mt-6 text-sm text-neutral-600">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-black underline"
        >
          Sign in
        </Link>
      </p>
    </main>
  );
}
