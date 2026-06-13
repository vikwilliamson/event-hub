import { z } from "zod";

const envSchema = z.object({
  // Firebase Client (public)
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1, "Firebase API key is required"),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1, "Firebase auth domain is required"),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1, "Firebase project ID is required"),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1, "Firebase app ID is required"),

  // Firebase Admin (server-only)
  FIREBASE_ADMIN_PROJECT_ID: z.string().min(1, "Firebase admin project ID is required"),
  FIREBASE_ADMIN_CLIENT_EMAIL: z
    .string()
    .email("Firebase admin client email must be valid"),
  FIREBASE_ADMIN_PRIVATE_KEY: z
    .string()
    .min(1, "Firebase admin private key is required"),

  // Session
  SESSION_COOKIE_NAME: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).optional(),

  // App URL
  NEXT_PUBLIC_APP_URL: z.string().url("App URL must be a valid URL").optional(),

  // Email
  EMAIL_PROVIDER_API_KEY: z.string().optional(),
  EMAIL_FROM_ADDRESS: z.string().email("Email from address must be valid").optional(),

  // Security
  CANCEL_TOKEN_SECRET: z.string().min(32, "Cancel token secret must be at least 32 characters").optional(),

  // AI
  ANTHROPIC_API_KEY: z.string().optional(),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.flatten();
    const fieldErrors = Object.entries(errors.fieldErrors)
      .map(([field, messages]) => `  ${field}: ${messages?.join(", ")}`)
      .join("\n");

    if (process.env.NODE_ENV === "development") {
      console.warn(
        "⚠️  Environment variables missing or invalid. Some features may not work.\n" +
          fieldErrors
      );
      return {
        NEXT_PUBLIC_FIREBASE_API_KEY: "",
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "",
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: "",
        NEXT_PUBLIC_FIREBASE_APP_ID: "",
        FIREBASE_ADMIN_PROJECT_ID: "",
        FIREBASE_ADMIN_CLIENT_EMAIL: "",
        FIREBASE_ADMIN_PRIVATE_KEY: "",
        SESSION_COOKIE_NAME: "session",
        NODE_ENV: "development" as const,
        NEXT_PUBLIC_APP_URL: undefined,
        EMAIL_PROVIDER_API_KEY: undefined,
        EMAIL_FROM_ADDRESS: undefined,
        CANCEL_TOKEN_SECRET: undefined,
        ANTHROPIC_API_KEY: undefined,
      };
    }

    throw new Error(
      `❌ Environment validation failed:\n${fieldErrors}\n\nSee .env.example for required variables.`
    );
  }

  return result.data;
}

export const env = validateEnv();
export type Env = z.infer<typeof envSchema>;
