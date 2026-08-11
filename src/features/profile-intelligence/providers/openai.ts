import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import {
  profileIntelligenceInputSchema,
  profileIntelligenceSchema,
} from "../schemas";
import { PROFILE_INTELLIGENCE_INSTRUCTIONS } from "../prompt";
import type {
  ProfileIntelligenceGeneration,
  ProfileIntelligenceGenerationOptions,
  ProfileIntelligenceProvider,
} from "../types";

type OpenAiProfileProviderConfig = {
  apiKey: string;
  model: string;
};

export class OpenAiProfileIntelligenceProvider
  implements ProfileIntelligenceProvider
{
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(config: OpenAiProfileProviderConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
    });

    this.model = config.model;
  }

  async generate(
    rawInput: Parameters<
      ProfileIntelligenceProvider["generate"]
    >[0],
    options: ProfileIntelligenceGenerationOptions = {},
  ): Promise<ProfileIntelligenceGeneration> {
    const input =
      profileIntelligenceInputSchema.parse(rawInput);

    const response = await this.client.responses.parse({
      model: this.model,

      instructions:
        PROFILE_INTELLIGENCE_INSTRUCTIONS,

      input: JSON.stringify(input),

      reasoning: {
        effort: "low",
      },

      text: {
        verbosity: "low",
        format: zodTextFormat(
          profileIntelligenceSchema,
          "profile_intelligence",
        ),
      },

      max_output_tokens: 1000,

      store: false,

      ...(options.safetyIdentifier
        ? {
            safety_identifier:
              options.safetyIdentifier,
          }
        : {}),
    });

    if (!response.output_parsed) {
      throw new Error(
        "OpenAI returned no parsed profile intelligence.",
      );
    }

    const intelligence =
      profileIntelligenceSchema.parse(
        response.output_parsed,
      );

    return {
      intelligence,
      metadata: {
        provider: "openai",
        model: this.model,
        requestId: response._request_id ?? undefined,
      },
    };
  }
}
