import type {
  ProfileIntelligence,
  ProfileIntelligenceInput,
} from "./schemas";

export type ProfileIntelligenceMetadata = {
  provider: "mock" | "openai";
  model: string;
  requestId?: string;
};

export type ProfileIntelligenceGeneration = {
  intelligence: ProfileIntelligence;
  metadata: ProfileIntelligenceMetadata;
};

export type ProfileIntelligenceGenerationOptions = {
  /**
   * Must be pseudonymous. Never pass an email, display name,
   * or raw internal user identifier to an external provider.
   */
  safetyIdentifier?: string;
};

export interface ProfileIntelligenceProvider {
  generate(
    input: ProfileIntelligenceInput,
    options?: ProfileIntelligenceGenerationOptions,
  ): Promise<ProfileIntelligenceGeneration>;
}
