import { z } from "zod";

const providerSchema = z.enum(["mock", "openai"]);

export type AiProviderName = z.infer<typeof providerSchema>;

export type AiConfig =
  | {
      provider: "mock";
      profileModel: "mock-profile-intelligence-v1";
    }
  | {
      provider: "openai";
      apiKey: string;
      profileModel: string;
      safetySecret: string;
    };

export function getAiConfig(
  env: NodeJS.ProcessEnv = process.env,
): AiConfig {
  const provider = providerSchema.parse(
    env.AI_PROVIDER || "mock",
  );

  if (provider === "mock") {
    return {
      provider: "mock",
      profileModel: "mock-profile-intelligence-v1",
    };
  }

  const apiKey = env.OPENAI_API_KEY?.trim();
  const profileModel =
    env.OPENAI_PROFILE_MODEL?.trim() || "gpt-5.6-luna";
  const safetySecret = env.AI_SAFETY_SECRET?.trim();

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is required when AI_PROVIDER=openai.",
    );
  }

  if (!safetySecret || safetySecret.length < 32) {
    throw new Error(
      "AI_SAFETY_SECRET must contain at least 32 characters when AI_PROVIDER=openai.",
    );
  }

  return {
    provider: "openai",
    apiKey,
    profileModel,
    safetySecret,
  };
}
