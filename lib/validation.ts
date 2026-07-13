import { z } from "zod";

/** Organization name: letters, numbers, spaces, & - . ' ( ) */
export const ORGANIZATION_NAME_REGEX = /^[A-Za-z0-9&().'\-\s]+$/;

/** Strict production email local + domain */
export const STRICT_EMAIL_REGEX =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/;

/** Last name: letters, spaces, apostrophe, hyphen, period */
export const LAST_NAME_REGEX = /^[A-Za-z .'\-]+$/;

export const organizationNameSchema = z
  .string()
  .trim()
  .min(2, "Organization name must be at least 2 characters")
  .max(100, "Organization name must be at most 100 characters")
  .regex(
    ORGANIZATION_NAME_REGEX,
    "Organization name can only contain letters, numbers, spaces, and & - . ' ( )",
  );

export const strictEmailSchema = z
  .string()
  .trim()
  .transform((value) => value.toLowerCase())
  .pipe(
    z
      .string()
      .min(1, "Email is required")
      .regex(STRICT_EMAIL_REGEX, "Please enter a valid email address")
      .refine((email) => !email.includes(".."), {
        message: "Please enter a valid email address",
      }),
  );

export const lastNameSchema = z
  .string()
  .trim()
  .min(1, "Last name is required")
  .max(50, "Last name must be at most 50 characters")
  .regex(
    LAST_NAME_REGEX,
    "Last name can only contain letters, spaces, apostrophes, hyphens, and periods",
  )
  .refine((value) => /[A-Za-z]/.test(value), {
    message: "Last name must contain at least one letter",
  });

export const optionalLastNameSchema = lastNameSchema.optional();
