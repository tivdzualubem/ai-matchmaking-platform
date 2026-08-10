import { z } from "zod";

const connectionGoalSchema = z.enum([
  "long_term_dating",
  "casual_dating",
  "friendship",
  "social_events",
]);

const socialStyleSchema = z.enum([
  "one_on_one",
  "small_groups",
  "large_groups",
  "mixed",
]);

const activityLevelSchema = z.enum([
  "low",
  "moderate",
  "high",
]);

const valueTagSchema = z.enum([
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

export const onboardingSchema = z
  .object({
    city: z
      .string()
      .trim()
      .min(2, "City is required.")
      .max(120, "City is too long."),

    countryCode: z
      .string()
      .trim()
      .length(2, "Use a two-letter country code.")
      .regex(/^[A-Za-z]{2}$/, "Use a valid two-letter country code.")
      .transform((value) => value.toUpperCase()),

    genderIdentity: z
      .string()
      .trim()
      .min(1, "Gender identity is required.")
      .max(80, "Gender identity is too long."),

    pronouns: z
      .string()
      .trim()
      .max(80, "Pronouns are too long."),

    goals: z
      .array(connectionGoalSchema)
      .min(1, "Choose at least one connection goal."),

    interestedInGenders: z
      .array(
        z
          .string()
          .trim()
          .min(1)
          .max(80),
      )
      .max(10, "Choose no more than 10 gender preferences."),

    minAge: z.coerce
      .number()
      .int()
      .min(18, "Minimum age cannot be below 18.")
      .max(100, "Minimum age is too high."),

    maxAge: z.coerce
      .number()
      .int()
      .min(18, "Maximum age cannot be below 18.")
      .max(100, "Maximum age is too high."),

    maxDistanceKm: z.coerce
      .number()
      .int()
      .min(1, "Distance must be at least 1 km.")
      .max(500, "Distance cannot exceed 500 km."),

    socialStyle: socialStyleSchema,

    activityLevel: activityLevelSchema,

    valueTags: z
      .array(valueTagSchema)
      .max(5, "Choose no more than five values."),

    interestIds: z
      .array(z.string().uuid())
      .min(3, "Choose at least three interests.")
      .max(10, "Choose no more than ten interests."),

    acceptTerms: z.literal("on"),

    acceptPrivacy: z.literal("on"),

    acceptAiMatching: z.literal("on"),

    acceptAiProfileProcessing: z.literal("on"),
  })
  .superRefine((data, context) => {
    if (data.minAge > data.maxAge) {
      context.addIssue({
        code: "custom",
        path: ["maxAge"],
        message: "Maximum age must be greater than or equal to minimum age.",
      });
    }

    const hasDatingGoal =
      data.goals.includes("long_term_dating") ||
      data.goals.includes("casual_dating");

    if (hasDatingGoal && data.interestedInGenders.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["interestedInGenders"],
        message:
          "Dating goals require at least one gender preference.",
      });
    }
  });

export type OnboardingInput = z.infer<typeof onboardingSchema>;
