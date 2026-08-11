export type OnboardingActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const initialOnboardingState: OnboardingActionState = {
  status: "idle",
};
