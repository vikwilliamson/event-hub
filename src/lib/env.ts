import { z } from 'zod';

// Firebase Client environment variables
const firebaseClientSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1, 'Firebase API key is required').optional(),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1, 'Firebase auth domain is required').optional(),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1, 'Firebase project ID is required').optional(),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1, 'Firebase app ID is required').optional(),
});

// Firebase Admin environment variables
const firebaseAdminSchema = z.object({
  FIREBASE_ADMIN_PROJECT_ID: z.string().min(1, 'Firebase admin project ID is required').optional(),
  FIREBASE_ADMIN_CLIENT_EMAIL: z.string().email('Firebase admin client email must be valid').optional(),
  FIREBASE_ADMIN_PRIVATE_KEY: z.string().min(1, 'Firebase admin private key is required').optional(),
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
      
      const errorMessage = `Environment validation failed: ${fieldErrors}`;
      
      // In development, just log warning and continue with defaults
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️  Firebase environment variables not configured. Some features may not work.');
        console.warn('Missing variables:', fieldErrors);
        return {
          NEXT_PUBLIC_FIREBASE_API_KEY: '',
          NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: '',
          NEXT_PUBLIC_FIREBASE_PROJECT_ID: '',
          NEXT_PUBLIC_FIREBASE_APP_ID: '',
          FIREBASE_ADMIN_PROJECT_ID: '',
          FIREBASE_ADMIN_CLIENT_EMAIL: '',
          FIREBASE_ADMIN_PRIVATE_KEY: '',
          SESSION_COOKIE_NAME: 'session',
          NODE_ENV: 'development'
        };
      }
      
      // In production, fail hard
      console.error('❌ ' + errorMessage);
      console.error('\n📋 To set up Firebase:');
      console.error('1. Create a Firebase project: https://console.firebase.google.com');
      console.error('2. Enable Authentication → Email/Password provider');
      console.error('3. Create Firestore Database');
      console.error('4. Go to Project Settings → Service Accounts → Generate new private key');
      console.error('5. Copy .env.example to .env.local and fill in the values');
      console.error('\n📄 Your .env.local should contain:');
      console.error('NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key');
      console.error('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com');
      console.error('NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id');
      console.error('NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id');
      console.error('FIREBASE_ADMIN_PROJECT_ID=your-project-id');
      console.error('FIREBASE_ADMIN_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com');
      console.error('FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"');
      
      throw new Error(errorMessage);
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
