import { z } from "zod";

function isAdult(birthDate: string): boolean {
  const parsed = new Date(`${birthDate}T00:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  const today = new Date();

  let age = today.getUTCFullYear() - parsed.getUTCFullYear();

  const birthdayHasPassed =
    today.getUTCMonth() > parsed.getUTCMonth() ||
    (today.getUTCMonth() === parsed.getUTCMonth() &&
      today.getUTCDate() >= parsed.getUTCDate());

  if (!birthdayHasPassed) {
    age -= 1;
  }

  return age >= 18;
}

export const signUpSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Display name must contain at least 2 characters.")
    .max(80, "Display name must contain at most 80 characters."),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address.")
    .max(254),

  birthDate: z
    .string()
    .min(1, "Birth date is required.")
    .refine(isAdult, "You must be at least 18 years old."),

  password: z
    .string()
    .min(12, "Password must contain at least 12 characters.")
    .max(128, "Password must contain at most 128 characters."),
});

export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address."),

  password: z.string().min(1, "Password is required."),
});
