import { describe, expect, it } from "vitest";

import { getAiConfig } from "@/lib/ai/config";
import { createAiSafetyIdentifier } from "@/lib/ai/safety-id";

import { createProfileIntelligenceProvider } from "./provider-factory";
import {
  profileIntelligenceInputSchema,
  profileIntelligenceSchema,
} from "./schemas";

const validInput = {
  bio: "I enjoy learning, hiking, and small live music events.",
  goals: [
    "long_term_dating",
    "social_events",
  ] as const,
  interests: [
    "Hiking",
    "Artificial Intelligence",
    "Live Music",
    "Travel",
  ],
  values: [
    "kindness",
    "curiosity",
    "growth",
  ] as const,
  socialStyle: "small_groups" as const,
  activityLevel: "moderate" as const,
};

describe("profile intelligence input", () => {
  it("accepts a valid grounded profile input", () => {
    const result =
      profileIntelligenceInputSchema.safeParse(
        validInput,
      );

    expect(result.success).toBe(true);
  });

  it("requires at least three interests", () => {
    const result =
      profileIntelligenceInputSchema.safeParse({
        ...validInput,
        interests: ["Hiking", "Music"],
      });

    expect(result.success).toBe(false);
  });

  it("does not define private identity fields as AI inputs", () => {
    const keys = Object.keys(
      profileIntelligenceInputSchema.shape,
    );

    expect(keys).not.toContain("email");
    expect(keys).not.toContain("birthDate");
    expect(keys).not.toContain("userId");
    expect(keys).not.toContain("countryCode");
    expect(keys).not.toContain("genderIdentity");
  });
});

describe("AI configuration", () => {
  it("defaults to the zero-cost mock provider", () => {
    expect(getAiConfig({})).toEqual({
      provider: "mock",
      profileModel:
        "mock-profile-intelligence-v1",
    });
  });

  it("requires an API key for the OpenAI provider", () => {
    expect(() =>
      getAiConfig({
        AI_PROVIDER: "openai",
        AI_SAFETY_SECRET:
          "12345678901234567890123456789012",
      }),
    ).toThrow(/OPENAI_API_KEY/);
  });

  it("requires a strong safety identifier secret", () => {
    expect(() =>
      getAiConfig({
        AI_PROVIDER: "openai",
        OPENAI_API_KEY: "test-key",
        AI_SAFETY_SECRET: "too-short",
      }),
    ).toThrow(/AI_SAFETY_SECRET/);
  });

  it("uses the cost-conscious model default", () => {
    const config = getAiConfig({
      AI_PROVIDER: "openai",
      OPENAI_API_KEY: "test-key",
      AI_SAFETY_SECRET:
        "12345678901234567890123456789012",
    });

    expect(config.provider).toBe("openai");

    if (config.provider === "openai") {
      expect(config.profileModel).toBe(
        "gpt-5.6-luna",
      );
    }
  });
});

describe("AI safety identifiers", () => {
  it("creates stable pseudonymous identifiers", () => {
    const userId =
      "11111111-1111-4111-8111-111111111111";

    const secret =
      "12345678901234567890123456789012";

    const first = createAiSafetyIdentifier(
      userId,
      secret,
    );

    const second = createAiSafetyIdentifier(
      userId,
      secret,
    );

    expect(first).toBe(second);
    expect(first).not.toContain(userId);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("mock profile intelligence provider", () => {
  it("generates schema-valid structured intelligence without an API call", async () => {
    const provider =
      createProfileIntelligenceProvider(
        getAiConfig({}),
      );

    const generation = await provider.generate(
      validInput,
    );

    expect(generation.metadata.provider).toBe(
      "mock",
    );

    expect(
      profileIntelligenceSchema.safeParse(
        generation.intelligence,
      ).success,
    ).toBe(true);

    expect(
      generation.intelligence
        .conversationStarters,
    ).toHaveLength(3);
  });

  it("keeps compatibility evidence tied to explicit source categories", async () => {
    const provider =
      createProfileIntelligenceProvider(
        getAiConfig({}),
      );

    const generation = await provider.generate(
      validInput,
    );

    for (const signal of generation.intelligence
      .compatibilitySignals) {
      expect([
        "bio",
        "goals",
        "interests",
        "values",
        "social_style",
        "activity_level",
      ]).toContain(signal.source);
    }
  });
});
