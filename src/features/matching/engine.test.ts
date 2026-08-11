import { describe, expect, it } from "vitest";

import { evaluateCompatibility } from "./engine";
import type {
  MatchPairContext,
  MatchProfile,
} from "./types";

const viewer: MatchProfile = {
  id: "viewer",
  age: 30,
  genderIdentity: "man",
  goals: [
    "long_term_dating",
    "friendship",
    "social_events",
  ],
  interestedInGenders: ["woman"],
  minAge: 25,
  maxAge: 36,
  maxDistanceKm: 50,
  interests: [
    "music",
    "hiking",
    "artificial-intelligence",
    "travel",
  ],
  values: [
    "kindness",
    "curiosity",
    "growth",
  ],
  socialStyle: "small_groups",
  activityLevel: "moderate",
  accountStatus: "active",
  discoverable: true,
};

const candidate: MatchProfile = {
  id: "candidate",
  age: 29,
  genderIdentity: "woman",
  goals: [
    "long_term_dating",
    "friendship",
    "social_events",
  ],
  interestedInGenders: ["man"],
  minAge: 27,
  maxAge: 35,
  maxDistanceKm: 40,
  interests: [
    "music",
    "hiking",
    "artificial-intelligence",
    "books",
  ],
  values: [
    "kindness",
    "curiosity",
    "growth",
  ],
  socialStyle: "small_groups",
  activityLevel: "moderate",
  accountStatus: "active",
  discoverable: true,
};

function context(
  overrides: Partial<MatchPairContext> = {},
): MatchPairContext {
  return {
    viewer,
    candidate,
    distanceKm: 8,
    ...overrides,
  };
}

describe("evaluateCompatibility", () => {
  it("returns a high score for a strongly compatible pair", () => {
    const result = evaluateCompatibility(context());

    expect(result.eligible).toBe(true);

    if (result.eligible) {
      expect(result.score).toBeGreaterThanOrEqual(75);
      expect(result.compatibleGoals).toContain(
        "long_term_dating",
      );
      expect(result.points.values).toBe(20);
    }
  });

  it("rejects matching a user with themselves", () => {
    const result = evaluateCompatibility(
      context({
        candidate: {
          ...candidate,
          id: viewer.id,
        },
      }),
    );

    expect(result.eligible).toBe(false);

    if (!result.eligible) {
      expect(result.reasons).toContain("same_user");
    }
  });

  it("rejects an underage candidate", () => {
    const result = evaluateCompatibility(
      context({
        candidate: {
          ...candidate,
          age: 17,
        },
      }),
    );

    expect(result.eligible).toBe(false);

    if (!result.eligible) {
      expect(result.reasons).toContain(
        "candidate_underage",
      );
    }
  });

  it("rejects blocked pairs", () => {
    const result = evaluateCompatibility(
      context({
        viewerBlockedCandidate: true,
      }),
    );

    expect(result.eligible).toBe(false);

    if (!result.eligible) {
      expect(result.reasons).toContain("blocked");
    }
  });

  it("rejects inactive candidates", () => {
    const result = evaluateCompatibility(
      context({
        candidate: {
          ...candidate,
          accountStatus: "suspended",
        },
      }),
    );

    expect(result.eligible).toBe(false);

    if (!result.eligible) {
      expect(result.reasons).toContain(
        "candidate_inactive",
      );
    }
  });

  it("rejects undiscoverable candidates", () => {
    const result = evaluateCompatibility(
      context({
        candidate: {
          ...candidate,
          discoverable: false,
        },
      }),
    );

    expect(result.eligible).toBe(false);

    if (!result.eligible) {
      expect(result.reasons).toContain(
        "candidate_not_discoverable",
      );
    }
  });

  it("requires mutual age-range compatibility", () => {
    const result = evaluateCompatibility(
      context({
        candidate: {
          ...candidate,
          minAge: 40,
          maxAge: 50,
        },
      }),
    );

    expect(result.eligible).toBe(false);

    if (!result.eligible) {
      expect(result.reasons).toContain(
        "candidate_age_preference_mismatch",
      );
    }
  });

  it("rejects candidates beyond the stricter distance limit", () => {
    const result = evaluateCompatibility(
      context({
        distanceKm: 45,
      }),
    );

    expect(result.eligible).toBe(false);

    if (!result.eligible) {
      expect(result.reasons).toContain(
        "distance_exceeded",
      );
    }
  });

  it("rejects dating-only pairs without mutual gender preference", () => {
    const result = evaluateCompatibility(
      context({
        viewer: {
          ...viewer,
          goals: ["long_term_dating"],
          interestedInGenders: ["woman"],
        },

        candidate: {
          ...candidate,
          goals: ["long_term_dating"],
          interestedInGenders: ["woman"],
        },
      }),
    );

    expect(result.eligible).toBe(false);

    if (!result.eligible) {
      expect(result.reasons).toContain(
        "no_compatible_goal",
      );
    }
  });

  it("can still match socially when dating preferences do not align", () => {
    const result = evaluateCompatibility(
      context({
        viewer: {
          ...viewer,
          goals: [
            "long_term_dating",
            "social_events",
          ],
        },

        candidate: {
          ...candidate,
          goals: [
            "long_term_dating",
            "social_events",
          ],
          interestedInGenders: ["woman"],
        },
      }),
    );

    expect(result.eligible).toBe(true);

    if (result.eligible) {
      expect(result.compatibleGoals).toEqual([
        "social_events",
      ]);
    }
  });

  it("scores a weaker-overlap pair below a stronger pair", () => {
    const strong = evaluateCompatibility(context());

    const weaker = evaluateCompatibility(
      context({
        candidate: {
          ...candidate,
          interests: ["gaming"],
          values: ["adventure"],
          socialStyle: "large_groups",
          activityLevel: "high",
        },
        distanceKm: 30,
      }),
    );

    expect(strong.eligible).toBe(true);
    expect(weaker.eligible).toBe(true);

    if (strong.eligible && weaker.eligible) {
      expect(weaker.score).toBeLessThan(strong.score);
    }
  });
});
