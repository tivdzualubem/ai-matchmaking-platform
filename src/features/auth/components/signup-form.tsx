"use client";

import { useActionState } from "react";

import { signUpAction } from "@/features/auth/actions";
import { initialAuthState } from "@/features/auth/state";

import { SubmitButton } from "./submit-button";

function FieldError({
  errors,
}: {
  errors?: string[];
}) {
  if (!errors?.length) {
    return null;
  }

  return (
    <p className="mt-1 text-sm text-red-600">
      {errors[0]}
    </p>
  );
}

export function SignUpForm() {
  const [state, formAction] = useActionState(
    signUpAction,
    initialAuthState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label
          htmlFor="displayName"
          className="mb-1 block text-sm font-medium"
        >
          Display name
        </label>

        <input
          id="displayName"
          name="displayName"
          type="text"
          autoComplete="name"
          required
          minLength={2}
          maxLength={80}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2"
        />

        <FieldError
          errors={state.fieldErrors?.displayName}
        />
      </div>

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

        <FieldError errors={state.fieldErrors?.email} />
      </div>

      <div>
        <label
          htmlFor="birthDate"
          className="mb-1 block text-sm font-medium"
        >
          Date of birth
        </label>

        <input
          id="birthDate"
          name="birthDate"
          type="date"
          required
          className="w-full rounded-lg border border-neutral-300 px-3 py-2"
        />

        <FieldError
          errors={state.fieldErrors?.birthDate}
        />

        <p className="mt-1 text-xs text-neutral-500">
          You must be at least 18 years old.
        </p>
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
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={128}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2"
        />

        <FieldError
          errors={state.fieldErrors?.password}
        />

        <p className="mt-1 text-xs text-neutral-500">
          Use at least 12 characters.
        </p>
      </div>

      {state.message ? (
        <div
          role="status"
          className={
            state.status === "success"
              ? "rounded-lg bg-green-50 p-3 text-sm text-green-800"
              : "rounded-lg bg-red-50 p-3 text-sm text-red-800"
          }
        >
          {state.message}
        </div>
      ) : null}

      <SubmitButton
        idleText="Create account"
        pendingText="Creating account..."
      />
    </form>
  );
}
