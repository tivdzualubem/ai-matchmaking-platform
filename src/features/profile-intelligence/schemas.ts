import { z } from "zod";

export const profileIntelligenceValueSchema = z.enum([
  "kindness",
  "curiosity",
  "ambition",
  "family",
  "creativity",
  "adventure",
  "stability",
  "community",
  "growth",
  "independence",
]);

export const profileIntelligenceInputSchema = z.object({
  bio: z.string().trim().max(1000),

  goals: z
    .array(
      z.enum([
        "long_term_dating",
        "casual_dating",
        "friendship",
        "social_events",
      ]),
    )
    .min(1)
    .max(4),

  interests: z
    .array(
      z.string().trim().min(1).max(80),
    )
    .min(3)
    .max(10),

  values: z
    .array(profileIntelligenceValueSchema)
    .max(5),

  socialStyle: z.enum([
    "one_on_one",
    "small_groups",
    "large_groups",
    "mixed",
  ]),

  activityLevel: z.enum([
    "low",
    "moderate",
    "high",
  ]),
});

export const profileIntelligenceEvidenceSchema = z.object({
  signal: z.string().trim().min(1).max(120),

  source: z.enum([
    "bio",
    "goals",
    "interests",
    "values",
    "social_style",
    "activity_level",
  ]),

  evidence: z.string().trim().min(1).max(160),
});

export const profileIntelligenceSchema = z.object({
  summary: z.string().trim().min(1).max(280),

  interestThemes: z
    .array(z.string().trim().min(1).max(80))
    .max(5),

  valuesEmphasized: z
    .array(profileIntelligenceValueSchema)
    .max(5),

  matchingKeywords: z
    .array(z.string().trim().min(1).max(60))
    .max(8),

  conversationStarters: z
    .array(z.string().trim().min(1).max(180))
    .length(3),

  compatibilitySignals: z
    .array(profileIntelligenceEvidenceSchema)
    .min(1)
    .max(6),

  limitations: z
    .array(z.string().trim().min(1).max(180))
    .max(3),
});

export type ProfileIntelligenceInput = z.infer<
  typeof profileIntelligenceInputSchema
>;

export type ProfileIntelligence = z.infer<
  typeof profileIntelligenceSchema
>;
