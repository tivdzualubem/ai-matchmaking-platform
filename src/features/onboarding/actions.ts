"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { onboardingSchema } from "./schemas";
import type { OnboardingActionState } from "./state";

const POLICY_VERSION = "1.0";

function parseCommaSeparated(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function databaseFailure(
  operation: string,
  code?: string,
): OnboardingActionState {
  console.error("Onboarding database operation failed", {
    operation,
    code,
  });

  return {
    status: "error",
    message:
      "We could not save your onboarding information. Please try again.",
  };
}

export async function submitOnboardingAction(
  _previousState: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const validation = onboardingSchema.safeParse({
    city: formData.get("city"),
    countryCode: formData.get("countryCode"),
    genderIdentity: formData.get("genderIdentity"),
    pronouns: formData.get("pronouns"),
    goals: formData.getAll("goals"),
    interestedInGenders: parseCommaSeparated(
      formData.get("interestedInGenders"),
    ),
    minAge: formData.get("minAge"),
    maxAge: formData.get("maxAge"),
    maxDistanceKm: formData.get("maxDistanceKm"),
    socialStyle: formData.get("socialStyle"),
    activityLevel: formData.get("activityLevel"),
    valueTags: formData.getAll("valueTags"),
    interestIds: formData.getAll("interestIds"),
    acceptTerms: formData.get("acceptTerms"),
    acceptPrivacy: formData.get("acceptPrivacy"),
    acceptAiMatching: formData.get("acceptAiMatching"),
    acceptAiProfileProcessing: formData.get(
      "acceptAiProfileProcessing",
    ),
  });

  if (!validation.success) {
    return {
      status: "error",
      message: "Please correct the highlighted onboarding fields.",
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  const data = validation.data;
  const supabase = await createClient();

  const {
    data: claimsData,
    error: claimsError,
  } = await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    return {
      status: "error",
      message: "Your session has expired. Please sign in again.",
    };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      city: data.city,
      country_code: data.countryCode,
    })
    .eq("id", userId);

  if (profileError) {
    return databaseFailure("profiles.update", profileError.code);
  }

  const { error: attributesError } = await supabase
    .from("profile_match_attributes")
    .update({
      gender_identity: data.genderIdentity,
      pronouns: data.pronouns || null,
      social_style: data.socialStyle,
      activity_level: data.activityLevel,
      values_tags: data.valueTags,
      languages: ["en"],
    })
    .eq("user_id", userId);

  if (attributesError) {
    return databaseFailure(
      "profile_match_attributes.update",
      attributesError.code,
    );
  }

  const { error: preferencesError } = await supabase
    .from("match_preferences")
    .update({
      goals: data.goals,
      interested_in_genders: data.interestedInGenders,
      min_age: data.minAge,
      max_age: data.maxAge,
      max_distance_km: data.maxDistanceKm,
    })
    .eq("user_id", userId);

  if (preferencesError) {
    return databaseFailure(
      "match_preferences.update",
      preferencesError.code,
    );
  }

  const { error: deleteInterestsError } = await supabase
    .from("user_interests")
    .delete()
    .eq("user_id", userId);

  if (deleteInterestsError) {
    return databaseFailure(
      "user_interests.delete",
      deleteInterestsError.code,
    );
  }

  const { error: insertInterestsError } = await supabase
    .from("user_interests")
    .insert(
      data.interestIds.map((interestId) => ({
        user_id: userId,
        interest_id: interestId,
        importance: 3,
      })),
    );

  if (insertInterestsError) {
    return databaseFailure(
      "user_interests.insert",
      insertInterestsError.code,
    );
  }

  const { error: consentError } = await supabase
    .from("user_consents")
    .insert([
      {
        user_id: userId,
        consent: "terms_of_service",
        policy_version: POLICY_VERSION,
        granted: true,
      },
      {
        user_id: userId,
        consent: "privacy_policy",
        policy_version: POLICY_VERSION,
        granted: true,
      },
      {
        user_id: userId,
        consent: "ai_matching",
        policy_version: POLICY_VERSION,
        granted: true,
      },
      {
        user_id: userId,
        consent: "ai_profile_processing",
        policy_version: POLICY_VERSION,
        granted: true,
      },
    ]);

  if (consentError) {
    return databaseFailure(
      "user_consents.insert",
      consentError.code,
    );
  }

  const { error: completionError } = await supabase.rpc(
    "complete_onboarding",
  );

  if (completionError) {
    return databaseFailure(
      "complete_onboarding",
      completionError.code,
    );
  }

  redirect("/onboarding?complete=1");
}
