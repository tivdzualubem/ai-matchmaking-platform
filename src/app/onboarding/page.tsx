import { redirect } from "next/navigation";

import { signOutAction } from "@/features/auth/actions";
import { OnboardingForm } from "@/features/onboarding/components/onboarding-form";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createClient();

  const {
    data: claimsData,
    error: claimsError,
  } = await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    redirect("/login");
  }

  const [
    profileResult,
    attributesResult,
    preferencesResult,
    interestsResult,
    userInterestsResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "display_name, city, country_code, onboarding_completed_at",
      )
      .eq("id", userId)
      .single(),

    supabase
      .from("profile_match_attributes")
      .select(
        "gender_identity, pronouns, social_style, activity_level, values_tags",
      )
      .eq("user_id", userId)
      .maybeSingle(),

    supabase
      .from("match_preferences")
      .select(
        "goals, interested_in_genders, min_age, max_age, max_distance_km",
      )
      .eq("user_id", userId)
      .single(),

    supabase
      .from("interests")
      .select("id, slug, name, category")
      .eq("is_active", true)
      .order("category")
      .order("name"),

    supabase
      .from("user_interests")
      .select("interest_id")
      .eq("user_id", userId),
  ]);

  if (profileResult.error) {
    throw new Error("Unable to load profile onboarding data.");
  }

  if (attributesResult.error) {
    throw new Error("Unable to load matchmaking attributes.");
  }

  if (preferencesResult.error) {
    throw new Error("Unable to load matching preferences.");
  }

  if (interestsResult.error) {
    throw new Error("Unable to load interest taxonomy.");
  }

  if (userInterestsResult.error) {
    throw new Error("Unable to load selected interests.");
  }

  const profile = profileResult.data;
  const attributes = attributesResult.data;
  const preferences = preferencesResult.data;

  if (profile.onboarding_completed_at) {
    return (
      <main className="min-h-screen bg-zinc-50 px-6 py-16">
        <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            AI Matchmaking Platform
          </p>

          <h1 className="mt-3 text-3xl font-semibold">
            Profile setup complete
          </h1>

          <p className="mt-4 text-zinc-600">
            Welcome, {profile.display_name}. Your account is active
            and ready for the matchmaking experience we build next.
          </p>

          <form action={signOutAction} className="mt-8">
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium"
            >
              Sign out
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-5 py-12 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            AI Matchmaking Platform
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Build your matching profile
          </h1>

          <p className="mt-3 max-w-2xl text-zinc-600">
            Welcome, {profile.display_name}. These answers create
            the structured compatibility profile that our
            matchmaking system will use.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
          <OnboardingForm
            interests={interestsResult.data ?? []}
            defaults={{
              city: profile.city ?? "",
              countryCode: profile.country_code ?? "",
              genderIdentity:
                attributes?.gender_identity ?? "",
              pronouns: attributes?.pronouns ?? "",
              goals: preferences.goals ?? [],
              interestedInGenders:
                preferences.interested_in_genders ?? [],
              minAge: preferences.min_age ?? 18,
              maxAge: preferences.max_age ?? 99,
              maxDistanceKm:
                preferences.max_distance_km ?? 50,
              socialStyle:
                attributes?.social_style ?? "",
              activityLevel:
                attributes?.activity_level ?? "",
              valueTags:
                attributes?.values_tags ?? [],
              interestIds:
                userInterestsResult.data?.map(
                  (row) => row.interest_id,
                ) ?? [],
            }}
          />
        </div>
      </div>
    </main>
  );
}
