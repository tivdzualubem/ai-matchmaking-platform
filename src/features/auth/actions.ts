"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { signInSchema, signUpSchema } from "./schemas";

import type { AuthActionState } from "./state";

export async function signUpAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const result = signUpSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    birthDate: formData.get("birthDate"),
    password: formData.get("password"),
  });

  if (!result.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: result.error.flatten().fieldErrors,
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!siteUrl) {
    throw new Error("NEXT_PUBLIC_SITE_URL is not configured.");
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: result.data.email,
    password: result.data.password,
    options: {
      data: {
        display_name: result.data.displayName,
        birth_date: result.data.birthDate,
      },
      emailRedirectTo: `${siteUrl}/auth/confirm?next=/onboarding`,
    },
  });

  if (error) {
    console.error("Authentication signup failed.", {
      status: error.status,
      code: error.code,
    });

    return {
      status: "error",
      message:
        "We could not create the account. Please check your details and try again.",
    };
  }

  // Local development may have email auto-confirm enabled.
  if (data.session) {
    redirect("/onboarding");
  }

  return {
    status: "success",
    message:
      "Account created. Check your email to confirm your address before signing in.",
  };
}

export async function signInAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const result = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!result.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: result.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: result.data.email,
    password: result.data.password,
  });

  if (error) {
    return {
      status: "error",
      message: "Invalid email or password.",
    };
  }

  redirect("/onboarding");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();

  await supabase.auth.signOut();

  redirect("/login");
}
