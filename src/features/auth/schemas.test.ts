import { describe, expect, it } from "vitest";

import { signInSchema, signUpSchema } from "./schemas";

function yearsAgo(years: number): string {
  const today = new Date();

  const year = today.getUTCFullYear() - years;
  const month = String(today.getUTCMonth() + 1).padStart(2, "0");
  const day = String(today.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

describe("signUpSchema", () => {
  const validSignup = {
    displayName: "Test Member",
    email: "member@example.com",
    birthDate: yearsAgo(25),
    password: "StrongPassword123!",
  };

  it("accepts a valid adult signup", () => {
    const result = signUpSchema.safeParse(validSignup);

    expect(result.success).toBe(true);
  });

  it("accepts a user who is exactly 18 years old", () => {
    const result = signUpSchema.safeParse({
      ...validSignup,
      birthDate: yearsAgo(18),
    });

    expect(result.success).toBe(true);
  });

  it("rejects an underage signup", () => {
    const result = signUpSchema.safeParse({
      ...validSignup,
      birthDate: yearsAgo(17),
    });

    expect(result.success).toBe(false);
  });

  it("rejects an invalid email address", () => {
    const result = signUpSchema.safeParse({
      ...validSignup,
      email: "not-an-email",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a password shorter than 12 characters", () => {
    const result = signUpSchema.safeParse({
      ...validSignup,
      password: "short123",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a display name shorter than 2 characters", () => {
    const result = signUpSchema.safeParse({
      ...validSignup,
      displayName: "A",
    });

    expect(result.success).toBe(false);
  });
});

describe("signInSchema", () => {
  it("accepts valid sign-in credentials", () => {
    const result = signInSchema.safeParse({
      email: "member@example.com",
      password: "any-password",
    });

    expect(result.success).toBe(true);
  });

  it("rejects malformed email addresses", () => {
    const result = signInSchema.safeParse({
      email: "invalid",
      password: "any-password",
    });

    expect(result.success).toBe(false);
  });

  it("rejects an empty password", () => {
    const result = signInSchema.safeParse({
      email: "member@example.com",
      password: "",
    });

    expect(result.success).toBe(false);
  });
});
