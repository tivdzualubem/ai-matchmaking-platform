import { describe, expect, it } from "vitest";

import { onboardingSchema } from "./schemas";

const interestIds = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
  "33333333-3333-4333-8333-333333333333",
];

const validOnboarding = {
  city: "Amsterdam",
  countryCode: "nl",
  genderIdentity: "man",
  pronouns: "he/him",
  goals: ["social_events"],
  interestedInGenders: [],
  minAge: "24",
  maxAge: "40",
  maxDistanceKm: "50",
  socialStyle: "small_groups",
  activityLevel: "moderate",
  valueTags: ["kindness", "curiosity", "growth"],
  interestIds,
  acceptTerms: "on",
  acceptPrivacy: "on",
  acceptAiMatching: "on",
  acceptAiProfileProcessing: "on",
};

describe("onboardingSchema", () => {
  it("accepts a valid social-events onboarding profile", () => {
    const result =
      onboardingSchema.safeParse(validOnboarding);

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.countryCode).toBe("NL");
    }
  });

  it("requires at least three interests", () => {
    const result = onboardingSchema.safeParse({
      ...validOnboarding,
      interestIds: interestIds.slice(0, 2),
    });

    expect(result.success).toBe(false);
  });

  it("rejects an age range below the adult minimum", () => {
    const result = onboardingSchema.safeParse({
      ...validOnboarding,
      minAge: "17",
    });

    expect(result.success).toBe(false);
  });

  it("rejects an inverted age range", () => {
    const result = onboardingSchema.safeParse({
      ...validOnboarding,
      minAge: "45",
      maxAge: "30",
    });

    expect(result.success).toBe(false);
  });

  it("requires gender preferences for dating goals", () => {
    const result = onboardingSchema.safeParse({
      ...validOnboarding,
      goals: ["long_term_dating"],
      interestedInGenders: [],
    });

    expect(result.success).toBe(false);
  });

  it("accepts dating when a gender preference is supplied", () => {
    const result = onboardingSchema.safeParse({
      ...validOnboarding,
      goals: ["long_term_dating"],
      interestedInGenders: ["women"],
    });

    expect(result.success).toBe(true);
  });

  it("requires the mandatory privacy and AI agreements", () => {
    const result = onboardingSchema.safeParse({
      ...validOnboarding,
      acceptAiMatching: undefined,
    });

    expect(result.success).toBe(false);
  });
});
