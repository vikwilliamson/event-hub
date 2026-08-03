import { z } from "zod";

/**
 * All external-service variables are optional: the demo runs entirely on the
 * local file store with no Firebase, email, maps, or AI keys configured.
 * Features that need a key degrade gracefully when it is absent.
 */
const envSchema = z.object({
  // Firebase (legacy — unused by the local-store runtime, kept for forward compat)
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().optional(),
  FIREBASE_ADMIN_PROJECT_ID: z.string().optional(),
  FIREBASE_ADMIN_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_ADMIN_PRIVATE_KEY: z.string().optional(),

  // Session
  SESSION_COOKIE_NAME: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).optional(),

  // App URL
  NEXT_PUBLIC_APP_URL: z.string().url("App URL must be a valid URL").optional(),

  // Local store
  EVENTHUB_DATA_FILE: z.string().optional(),

  // Email
  EMAIL_PROVIDER_API_KEY: z.string().optional(),
  EMAIL_FROM_ADDRESS: z.string().email("Email from address must be valid").optional(),

  // Maps
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional(),

  // AI
  ANTHROPIC_API_KEY: z.string().optional(),
});

function validateEnv(): z.infer<typeof envSchema> {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.flatten();
    const fieldErrors = Object.entries(errors.fieldErrors)
      .map(([field, messages]) => `  ${field}: ${messages?.join(", ")}`)
      .join("\n");

    if (process.env.NODE_ENV === "production") {
      throw new Error(
        `❌ Environment validation failed:\n${fieldErrors}\n\nSee .env.example for variables.`
      );
    }

    console.warn(
      "⚠️  Environment variables invalid; falling back to defaults. Some features may not work.\n" +
        fieldErrors
    );
    return envSchema.parse({ NODE_ENV: process.env.NODE_ENV ?? "development" });
  }

  return result.data;
}

export const env = validateEnv();
export type Env = z.infer<typeof envSchema>;
