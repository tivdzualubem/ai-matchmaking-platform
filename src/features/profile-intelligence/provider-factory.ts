import type { AiConfig } from "@/lib/ai/config";

import type { ProfileIntelligenceProvider } from "./types";
import { MockProfileIntelligenceProvider } from "./providers/mock";
import { OpenAiProfileIntelligenceProvider } from "./providers/openai";

export function createProfileIntelligenceProvider(
  config: AiConfig,
): ProfileIntelligenceProvider {
  if (config.provider === "mock") {
    return new MockProfileIntelligenceProvider();
  }

  return new OpenAiProfileIntelligenceProvider({
    apiKey: config.apiKey,
    model: config.profileModel,
  });
}
