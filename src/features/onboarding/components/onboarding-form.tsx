"use client";

import { useActionState } from "react";

import { submitOnboardingAction } from "../actions";
import { initialOnboardingState } from "../state";

type InterestOption = {
  id: string;
  slug: string;
  name: string;
  category: string;
};

type OnboardingDefaults = {
  city: string;
  countryCode: string;
  genderIdentity: string;
  pronouns: string;
  goals: string[];
  interestedInGenders: string[];
  minAge: number;
  maxAge: number;
  maxDistanceKm: number;
  socialStyle: string;
  activityLevel: string;
  valueTags: string[];
  interestIds: string[];
};

type OnboardingFormProps = {
  interests: InterestOption[];
  defaults: OnboardingDefaults;
};

const goals = [
  {
    value: "long_term_dating",
    label: "Long-term dating",
  },
  {
    value: "casual_dating",
    label: "Casual dating",
  },
  {
    value: "friendship",
    label: "Friendship",
  },
  {
    value: "social_events",
    label: "Social events",
  },
];

const values = [
  ["kindness", "Kindness"],
  ["curiosity", "Curiosity"],
  ["ambition", "Ambition"],
  ["family", "Family"],
  ["creativity", "Creativity"],
  ["adventure", "Adventure"],
  ["stability", "Stability"],
  ["community", "Community"],
  ["growth", "Personal growth"],
  ["independence", "Independence"],
] as const;

export function OnboardingForm({
  interests,
  defaults,
}: OnboardingFormProps) {
  const [state, formAction, pending] = useActionState(
    submitOnboardingAction,
    initialOnboardingState,
  );

  const groupedInterests = interests.reduce<
    Record<string, InterestOption[]>
  >((groups, interest) => {
    groups[interest.category] ??= [];
    groups[interest.category].push(interest);
    return groups;
  }, {});

  const errorFor = (field: string) =>
    state.fieldErrors?.[field]?.[0];

  return (
    <form action={formAction} className="space-y-10">
      <section className="space-y-5">
        <div>
          <h2 className="text-xl font-semibold">
            About you
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            We use approximate location and profile details to
            improve relevant recommendations.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium">City</span>
            <input
              name="city"
              required
              defaultValue={defaults.city}
              maxLength={120}
              autoComplete="address-level2"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2"
            />
            {errorFor("city") && (
              <p className="text-sm text-red-600">
                {errorFor("city")}
              </p>
            )}
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">
              Country code
            </span>
            <input
              name="countryCode"
              required
              defaultValue={defaults.countryCode}
              maxLength={2}
              placeholder="NL"
              autoComplete="country"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 uppercase"
            />
            {errorFor("countryCode") && (
              <p className="text-sm text-red-600">
                {errorFor("countryCode")}
              </p>
            )}
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">
              Gender identity
            </span>
            <input
              name="genderIdentity"
              required
              defaultValue={defaults.genderIdentity}
              maxLength={80}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2"
            />
            {errorFor("genderIdentity") && (
              <p className="text-sm text-red-600">
                {errorFor("genderIdentity")}
              </p>
            )}
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">
              Pronouns
            </span>
            <input
              name="pronouns"
              defaultValue={defaults.pronouns}
              maxLength={80}
              placeholder="Optional"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
        </div>
      </section>

      <section className="space-y-5">
        <div>
          <h2 className="text-xl font-semibold">
            What are you looking for?
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            These preferences are matching inputs, not public
            profile fields.
          </p>
        </div>

        <fieldset>
          <legend className="text-sm font-medium">
            Connection goals
          </legend>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {goals.map((goal) => (
              <label
                key={goal.value}
                className="flex items-center gap-3 rounded-lg border border-zinc-200 p-3"
              >
                <input
                  type="checkbox"
                  name="goals"
                  value={goal.value}
                  defaultChecked={defaults.goals.includes(
                    goal.value,
                  )}
                />
                <span>{goal.label}</span>
              </label>
            ))}
          </div>

          {errorFor("goals") && (
            <p className="mt-2 text-sm text-red-600">
              {errorFor("goals")}
            </p>
          )}
        </fieldset>

        <label className="block space-y-2">
          <span className="text-sm font-medium">
            Dating gender preferences
          </span>
          <input
            name="interestedInGenders"
            defaultValue={defaults.interestedInGenders.join(
              ", ",
            )}
            placeholder="Example: women, men, nonbinary people"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2"
          />
          <p className="text-xs text-zinc-500">
            Required only when a dating goal is selected. Separate
            multiple preferences with commas.
          </p>
          {errorFor("interestedInGenders") && (
            <p className="text-sm text-red-600">
              {errorFor("interestedInGenders")}
            </p>
          )}
        </label>

        <div className="grid gap-5 sm:grid-cols-3">
          <label className="space-y-2">
            <span className="text-sm font-medium">
              Minimum age
            </span>
            <input
              type="number"
              name="minAge"
              min={18}
              max={100}
              required
              defaultValue={defaults.minAge}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2"
            />
            {errorFor("minAge") && (
              <p className="text-sm text-red-600">
                {errorFor("minAge")}
              </p>
            )}
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">
              Maximum age
            </span>
            <input
              type="number"
              name="maxAge"
              min={18}
              max={100}
              required
              defaultValue={defaults.maxAge}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2"
            />
            {errorFor("maxAge") && (
              <p className="text-sm text-red-600">
                {errorFor("maxAge")}
              </p>
            )}
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">
              Max distance (km)
            </span>
            <input
              type="number"
              name="maxDistanceKm"
              min={1}
              max={500}
              required
              defaultValue={defaults.maxDistanceKm}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2"
            />
            {errorFor("maxDistanceKm") && (
              <p className="text-sm text-red-600">
                {errorFor("maxDistanceKm")}
              </p>
            )}
          </label>
        </div>
      </section>

      <section className="space-y-5">
        <div>
          <h2 className="text-xl font-semibold">
            Compatibility signals
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            These structured signals will later feed the
            deterministic and AI-assisted compatibility engine.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium">
              Social style
            </span>
            <select
              name="socialStyle"
              required
              defaultValue={defaults.socialStyle}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2"
            >
              <option value="">Select one</option>
              <option value="one_on_one">
                Mostly one-on-one
              </option>
              <option value="small_groups">
                Small groups
              </option>
              <option value="large_groups">
                Large groups
              </option>
              <option value="mixed">
                A mix of settings
              </option>
            </select>
            {errorFor("socialStyle") && (
              <p className="text-sm text-red-600">
                {errorFor("socialStyle")}
              </p>
            )}
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium">
              Activity level
            </span>
            <select
              name="activityLevel"
              required
              defaultValue={defaults.activityLevel}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2"
            >
              <option value="">Select one</option>
              <option value="low">Low-key</option>
              <option value="moderate">Moderately active</option>
              <option value="high">Very active</option>
            </select>
            {errorFor("activityLevel") && (
              <p className="text-sm text-red-600">
                {errorFor("activityLevel")}
              </p>
            )}
          </label>
        </div>

        <fieldset>
          <legend className="text-sm font-medium">
            Values — choose up to five
          </legend>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {values.map(([value, label]) => (
              <label
                key={value}
                className="flex items-center gap-3 rounded-lg border border-zinc-200 p-3"
              >
                <input
                  type="checkbox"
                  name="valueTags"
                  value={value}
                  defaultChecked={defaults.valueTags.includes(
                    value,
                  )}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>

          {errorFor("valueTags") && (
            <p className="mt-2 text-sm text-red-600">
              {errorFor("valueTags")}
            </p>
          )}
        </fieldset>
      </section>

      <section className="space-y-5">
        <div>
          <h2 className="text-xl font-semibold">
            Interests
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Choose between three and ten.
          </p>
        </div>

        <div className="space-y-6">
          {Object.entries(groupedInterests).map(
            ([category, categoryInterests]) => (
              <fieldset key={category}>
                <legend className="text-sm font-semibold capitalize">
                  {category}
                </legend>

                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {categoryInterests.map((interest) => (
                    <label
                      key={interest.id}
                      className="flex items-center gap-3 rounded-lg border border-zinc-200 p-3"
                    >
                      <input
                        type="checkbox"
                        name="interestIds"
                        value={interest.id}
                        defaultChecked={defaults.interestIds.includes(
                          interest.id,
                        )}
                      />
                      <span>{interest.name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ),
          )}
        </div>

        {errorFor("interestIds") && (
          <p className="text-sm text-red-600">
            {errorFor("interestIds")}
          </p>
        )}
      </section>

      <section className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-5">
        <div>
          <h2 className="text-xl font-semibold">
            Privacy and AI choices
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            These decisions are recorded with a policy version so
            they remain auditable.
          </p>
        </div>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="acceptTerms"
            className="mt-1"
          />
          <span className="text-sm">
            I accept the Terms of Service.
          </span>
        </label>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="acceptPrivacy"
            className="mt-1"
          />
          <span className="text-sm">
            I acknowledge the Privacy Policy.
          </span>
        </label>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="acceptAiMatching"
            className="mt-1"
          />
          <span className="text-sm">
            I agree to use of my matching inputs by the
            AI-assisted matchmaking system.
          </span>
        </label>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="acceptAiProfileProcessing"
            className="mt-1"
          />
          <span className="text-sm">
            I agree to AI-assisted processing of my profile for
            compatibility and recommendation features.
          </span>
        </label>

        {(errorFor("acceptTerms") ||
          errorFor("acceptPrivacy") ||
          errorFor("acceptAiMatching") ||
          errorFor("acceptAiProfileProcessing")) && (
          <p className="text-sm text-red-600">
            All required onboarding agreements must be accepted.
          </p>
        )}
      </section>

      {state.message && (
        <div
          className={
            state.status === "error"
              ? "rounded-lg bg-red-50 p-4 text-sm text-red-700"
              : "rounded-lg bg-green-50 p-4 text-sm text-green-700"
          }
        >
          {state.message}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-black px-5 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending
          ? "Saving your profile..."
          : "Complete onboarding"}
      </button>
    </form>
  );
}
