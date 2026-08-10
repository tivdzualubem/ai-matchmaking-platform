import { redirect } from "next/navigation";

import { signOutAction } from "@/features/auth/actions";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();

  const userId = data?.claims?.sub;

  if (error || !userId) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, onboarding_completed_at")
    .eq("id", userId)
    .single();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-neutral-500">
            Onboarding
          </p>

          <h1 className="mt-2 text-3xl font-semibold">
            Welcome{profile?.display_name
              ? `, ${profile.display_name}`
              : ""}
          </h1>
        </div>

        <form action={signOutAction}>
          <button
            type="submit"
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium"
          >
            Sign out
          </button>
        </form>
      </div>

      <div className="mt-10 rounded-xl border border-neutral-200 p-6">
        <h2 className="text-xl font-semibold">
          Profile setup
        </h2>

        <p className="mt-2 text-neutral-600">
          Authentication is complete. Next we will collect the
          preferences and profile information required by the
          matchmaking engine.
        </p>
      </div>
    </main>
  );
}
