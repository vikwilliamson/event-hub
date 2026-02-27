import { z } from 'zod';

// Firebase Client environment variables
const firebaseClientSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1, 'Firebase API key is required'),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1, 'Firebase auth domain is required'),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1, 'Firebase project ID is required'),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1, 'Firebase app ID is required'),
});

// Firebase Admin environment variables
const firebaseAdminSchema = z.object({
  FIREBASE_ADMIN_PROJECT_ID: z.string().min(1, 'Firebase admin project ID is required'),
  FIREBASE_ADMIN_CLIENT_EMAIL: z.string().email('Firebase admin client email must be valid'),
  FIREBASE_ADMIN_PRIVATE_KEY: z.string().min(1, 'Firebase admin private key is required'),
});

// Optional environment variables
const optionalSchema = z.object({
  SESSION_COOKIE_NAME: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
});

// Combined schema
const envSchema = firebaseClientSchema.merge(firebaseAdminSchema).merge(optionalSchema);

// Validate environment variables
function validateEnv() {
  try {
    const result = envSchema.safeParse(process.env);
    
    if (!result.success) {
      const errors = result.error.flatten();
      const fieldErrors = Object.entries(errors.fieldErrors)
        .map(([field, messages]) => `${field}: ${messages?.join(', ')}`)
        .join('; ');
      
      throw new Error(`Environment validation failed: ${fieldErrors}`);
    }
    
    return result.data;
  } catch (error) {
    console.error('❌ Environment validation failed:', error);
    process.exit(1);
  }
}

// Export validated environment
export const env = validateEnv();

// Type-safe environment access
export type Env = z.infer<typeof envSchema>;
