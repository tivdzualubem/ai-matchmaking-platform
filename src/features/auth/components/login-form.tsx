"use client";

import { useActionState } from "react";

import { signInAction } from "@/features/auth/actions";
import { initialAuthState } from "@/features/auth/state";

import { SubmitButton } from "./submit-button";

export function LoginForm() {
  const [state, formAction] = useActionState(
    signInAction,
    initialAuthState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label
          htmlFor="email"
          className="mb-1 block text-sm font-medium"
        >
          Email
        </label>

        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-lg border border-neutral-300 px-3 py-2"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-1 block text-sm font-medium"
        >
          Password
        </label>

        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-lg border border-neutral-300 px-3 py-2"
        />
      </div>

      {state.message ? (
        <div
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
        >
          {state.message}
        </div>
      ) : null}

      <SubmitButton
        idleText="Sign in"
        pendingText="Signing in..."
      />
    </form>
  );
}
