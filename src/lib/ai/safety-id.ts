import { createHmac } from "node:crypto";

/**
 * Produces a stable pseudonymous identifier for provider-side
 * safety systems without sending our internal user UUID.
 */
export function createAiSafetyIdentifier(
  userId: string,
  secret: string,
): string {
  if (!userId.trim()) {
    throw new Error("userId is required.");
  }

  if (secret.length < 32) {
    throw new Error(
      "AI safety identifier secret must contain at least 32 characters.",
    );
  }

  return createHmac("sha256", secret)
    .update(userId)
    .digest("hex");
}
