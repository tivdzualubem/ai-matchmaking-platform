import type {
  CompatibilityEvaluation,
  CompatibilitySignals,
  ConnectionGoal,
  IneligibilityReason,
  MatchPairContext,
  MatchProfile,
} from "./types";

const WEIGHTS = {
  goals: 25,
  interests: 25,
  values: 20,
  socialStyle: 10,
  activityLevel: 10,
  ageFit: 5,
  distanceFit: 5,
} as const;

const DATING_GOALS = new Set<ConnectionGoal>([
  "long_term_dating",
  "casual_dating",
]);

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase("en");
}

function uniqueNormalized(values: string[]): Set<string> {
  return new Set(
    values
      .map(normalizeText)
      .filter((value) => value.length > 0),
  );
}

function jaccardSimilarity(
  leftValues: string[],
  rightValues: string[],
): number {
  const left = uniqueNormalized(leftValues);
  const right = uniqueNormalized(rightValues);

  if (left.size === 0 && right.size === 0) {
    return 0;
  }

  let intersection = 0;

  for (const value of left) {
    if (right.has(value)) {
      intersection += 1;
    }
  }

  const union = new Set([...left, ...right]).size;

  return union === 0 ? 0 : intersection / union;
}

function goalSimilarity(
  viewer: MatchProfile,
  candidate: MatchProfile,
  compatibleGoals: ConnectionGoal[],
): number {
  const union = new Set([
    ...viewer.goals,
    ...candidate.goals,
  ]);

  return union.size === 0
    ? 0
    : compatibleGoals.length / union.size;
}

function genderPreferenceIncludes(
  profile: MatchProfile,
  otherGenderIdentity: string,
): boolean {
  const expectedGender = normalizeText(otherGenderIdentity);

  return profile.interestedInGenders.some(
    (gender) => normalizeText(gender) === expectedGender,
  );
}

function isGoalCompatible(
  goal: ConnectionGoal,
  viewer: MatchProfile,
  candidate: MatchProfile,
): boolean {
  if (!DATING_GOALS.has(goal)) {
    return true;
  }

  return (
    genderPreferenceIncludes(
      viewer,
      candidate.genderIdentity,
    ) &&
    genderPreferenceIncludes(
      candidate,
      viewer.genderIdentity,
    )
  );
}

function compatibleGoals(
  viewer: MatchProfile,
  candidate: MatchProfile,
): ConnectionGoal[] {
  const candidateGoals = new Set(candidate.goals);

  return viewer.goals.filter(
    (goal) =>
      candidateGoals.has(goal) &&
      isGoalCompatible(goal, viewer, candidate),
  );
}

function rangeAffinity(
  value: number,
  minimum: number,
  maximum: number,
): number {
  if (value < minimum || value > maximum) {
    return 0;
  }

  if (minimum === maximum) {
    return value === minimum ? 1 : 0;
  }

  const midpoint = (minimum + maximum) / 2;
  const halfRange = (maximum - minimum) / 2;

  if (halfRange === 0) {
    return 1;
  }

  return clamp01(
    1 - Math.abs(value - midpoint) / halfRange,
  );
}

function ageAffinity(
  viewer: MatchProfile,
  candidate: MatchProfile,
): number {
  const viewerPreference = rangeAffinity(
    candidate.age,
    viewer.minAge,
    viewer.maxAge,
  );

  const candidatePreference = rangeAffinity(
    viewer.age,
    candidate.minAge,
    candidate.maxAge,
  );

  return (viewerPreference + candidatePreference) / 2;
}

function distanceAffinity(
  distanceKm: number,
  viewer: MatchProfile,
  candidate: MatchProfile,
): number {
  const effectiveMaximum = Math.min(
    viewer.maxDistanceKm,
    candidate.maxDistanceKm,
  );

  if (effectiveMaximum <= 0) {
    return 0;
  }

  return clamp01(1 - distanceKm / effectiveMaximum);
}

function collectIneligibilityReasons(
  context: MatchPairContext,
  goals: ConnectionGoal[],
): IneligibilityReason[] {
  const {
    viewer,
    candidate,
    distanceKm,
    viewerBlockedCandidate = false,
    candidateBlockedViewer = false,
  } = context;

  const reasons: IneligibilityReason[] = [];

  if (viewer.id === candidate.id) {
    reasons.push("same_user");
  }

  if (viewer.age < 18) {
    reasons.push("viewer_underage");
  }

  if (candidate.age < 18) {
    reasons.push("candidate_underage");
  }

  if (viewer.accountStatus !== "active") {
    reasons.push("viewer_inactive");
  }

  if (candidate.accountStatus !== "active") {
    reasons.push("candidate_inactive");
  }

  if (!candidate.discoverable) {
    reasons.push("candidate_not_discoverable");
  }

  if (viewerBlockedCandidate || candidateBlockedViewer) {
    reasons.push("blocked");
  }

  if (
    candidate.age < viewer.minAge ||
    candidate.age > viewer.maxAge
  ) {
    reasons.push("viewer_age_preference_mismatch");
  }

  if (
    viewer.age < candidate.minAge ||
    viewer.age > candidate.maxAge
  ) {
    reasons.push("candidate_age_preference_mismatch");
  }

  const effectiveMaximumDistance = Math.min(
    viewer.maxDistanceKm,
    candidate.maxDistanceKm,
  );

  if (
    !Number.isFinite(distanceKm) ||
    distanceKm < 0 ||
    distanceKm > effectiveMaximumDistance
  ) {
    reasons.push("distance_exceeded");
  }

  if (goals.length === 0) {
    reasons.push("no_compatible_goal");
  }

  return reasons;
}

function buildSignals(
  context: MatchPairContext,
  goals: ConnectionGoal[],
): CompatibilitySignals {
  const { viewer, candidate, distanceKm } = context;

  return {
    goals: goalSimilarity(
      viewer,
      candidate,
      goals,
    ),

    interests: jaccardSimilarity(
      viewer.interests,
      candidate.interests,
    ),

    values: jaccardSimilarity(
      viewer.values,
      candidate.values,
    ),

    socialStyle:
      viewer.socialStyle === candidate.socialStyle
        ? 1
        : viewer.socialStyle === "mixed" ||
            candidate.socialStyle === "mixed"
          ? 0.7
          : 0.25,

    activityLevel:
      viewer.activityLevel === candidate.activityLevel
        ? 1
        : (
              viewer.activityLevel === "moderate" ||
              candidate.activityLevel === "moderate"
            )
          ? 0.6
          : 0.2,

    ageFit: ageAffinity(viewer, candidate),

    distanceFit: distanceAffinity(
      distanceKm,
      viewer,
      candidate,
    ),
  };
}

export function evaluateCompatibility(
  context: MatchPairContext,
): CompatibilityEvaluation {
  const goals = compatibleGoals(
    context.viewer,
    context.candidate,
  );

  const reasons = collectIneligibilityReasons(
    context,
    goals,
  );

  if (reasons.length > 0) {
    return {
      eligible: false,
      score: null,
      compatibleGoals: goals,
      reasons,
    };
  }

  const signals = buildSignals(context, goals);

  const points = {
    goals: signals.goals * WEIGHTS.goals,
    interests:
      signals.interests * WEIGHTS.interests,
    values: signals.values * WEIGHTS.values,
    socialStyle:
      signals.socialStyle * WEIGHTS.socialStyle,
    activityLevel:
      signals.activityLevel * WEIGHTS.activityLevel,
    ageFit: signals.ageFit * WEIGHTS.ageFit,
    distanceFit:
      signals.distanceFit * WEIGHTS.distanceFit,
  };

  const score = Math.round(
    Object.values(points).reduce(
      (total, value) => total + value,
      0,
    ),
  );

  return {
    eligible: true,
    score,
    compatibleGoals: goals,
    reasons: [],
    signals,
    points,
  };
}
