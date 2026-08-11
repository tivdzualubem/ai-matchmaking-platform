export type ConnectionGoal =
  | "long_term_dating"
  | "casual_dating"
  | "friendship"
  | "social_events";

export type SocialStyle =
  | "one_on_one"
  | "small_groups"
  | "large_groups"
  | "mixed";

export type ActivityLevel =
  | "low"
  | "moderate"
  | "high";

export type AccountStatus =
  | "onboarding"
  | "active"
  | "suspended"
  | "deleted";

export type MatchProfile = {
  id: string;
  age: number;
  genderIdentity: string;

  goals: ConnectionGoal[];
  interestedInGenders: string[];

  minAge: number;
  maxAge: number;
  maxDistanceKm: number;

  interests: string[];
  values: string[];

  socialStyle: SocialStyle;
  activityLevel: ActivityLevel;

  accountStatus: AccountStatus;
  discoverable: boolean;
};

export type MatchPairContext = {
  viewer: MatchProfile;
  candidate: MatchProfile;

  /**
   * Distance is computed outside this pure domain layer.
   * The engine does not infer or fabricate geographic distance.
   */
  distanceKm: number;

  viewerBlockedCandidate?: boolean;
  candidateBlockedViewer?: boolean;
};

export type IneligibilityReason =
  | "same_user"
  | "viewer_underage"
  | "candidate_underage"
  | "viewer_inactive"
  | "candidate_inactive"
  | "candidate_not_discoverable"
  | "blocked"
  | "viewer_age_preference_mismatch"
  | "candidate_age_preference_mismatch"
  | "distance_exceeded"
  | "no_compatible_goal";

export type CompatibilitySignals = {
  goals: number;
  interests: number;
  values: number;
  socialStyle: number;
  activityLevel: number;
  ageFit: number;
  distanceFit: number;
};

export type CompatibilityPoints = {
  goals: number;
  interests: number;
  values: number;
  socialStyle: number;
  activityLevel: number;
  ageFit: number;
  distanceFit: number;
};

export type CompatibilityEvaluation =
  | {
      eligible: false;
      score: null;
      compatibleGoals: ConnectionGoal[];
      reasons: IneligibilityReason[];
    }
  | {
      eligible: true;
      score: number;
      compatibleGoals: ConnectionGoal[];
      reasons: [];
      signals: CompatibilitySignals;
      points: CompatibilityPoints;
    };
