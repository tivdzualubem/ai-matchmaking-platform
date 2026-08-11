import {
  profileIntelligenceInputSchema,
  profileIntelligenceSchema,
} from "../schemas";
import type {
  ProfileIntelligenceGeneration,
  ProfileIntelligenceGenerationOptions,
  ProfileIntelligenceProvider,
} from "../types";

function humanize(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export class MockProfileIntelligenceProvider
  implements ProfileIntelligenceProvider
{
  async generate(
    rawInput: Parameters<
      ProfileIntelligenceProvider["generate"]
    >[0],
    _options?: ProfileIntelligenceGenerationOptions,
  ): Promise<ProfileIntelligenceGeneration> {
    void _options;

    const input =
      profileIntelligenceInputSchema.parse(rawInput);

    const primaryInterests = input.interests.slice(0, 5);

    const summaryParts = [
      `Interested in ${primaryInterests
        .slice(0, 3)
        .join(", ")}.`,
      `Prefers ${humanize(
        input.socialStyle,
      ).toLowerCase()} social settings`,
      `with a ${input.activityLevel} activity level.`,
    ];

    const conversationStarters = input.interests
      .slice(0, 3)
      .map(
        (interest) =>
          `What do you enjoy most about ${interest}?`,
      );

    const intelligence =
      profileIntelligenceSchema.parse({
        summary: summaryParts.join(" "),

        interestThemes: primaryInterests,

        valuesEmphasized: input.values,

        matchingKeywords: [
          ...input.interests,
          ...input.values,
        ].slice(0, 8),

        conversationStarters,

        compatibilitySignals: [
          {
            signal: "Connection goals are explicitly available.",
            source: "goals",
            evidence: input.goals.join(", "),
          },
          {
            signal: "Social-setting preference is explicit.",
            source: "social_style",
            evidence: input.socialStyle,
          },
          {
            signal: "Activity preference is explicit.",
            source: "activity_level",
            evidence: input.activityLevel,
          },
        ],

        limitations: input.bio
          ? []
          : [
              "No free-text biography was supplied, so interpretation is limited to structured profile fields.",
            ],
      });

    return {
      intelligence,
      metadata: {
        provider: "mock",
        model: "mock-profile-intelligence-v1",
      },
    };
  }
}
