import { config } from "dotenv";

// Load environment variables from .env.local
config({ path: ".env.local" });

console.log("Testing environment variables:");
console.log("NEXT_PUBLIC_FIREBASE_API_KEY:", process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "✅ Set" : "❌ Missing");
console.log("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:", process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? "✅ Set" : "❌ Missing");
console.log("NEXT_PUBLIC_FIREBASE_PROJECT_ID:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? "✅ Set" : "❌ Missing");
console.log("NEXT_PUBLIC_FIREBASE_APP_ID:", process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? "✅ Set" : "❌ Missing");
console.log("FIREBASE_ADMIN_PROJECT_ID:", process.env.FIREBASE_ADMIN_PROJECT_ID ? "✅ Set" : "❌ Missing");
console.log("FIREBASE_ADMIN_CLIENT_EMAIL:", process.env.FIREBASE_ADMIN_CLIENT_EMAIL ? "✅ Set" : "❌ Missing");
console.log("FIREBASE_ADMIN_PRIVATE_KEY:", process.env.FIREBASE_ADMIN_PRIVATE_KEY ? "✅ Set" : "❌ Missing");
