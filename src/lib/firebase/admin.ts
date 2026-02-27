import { getApps, getApp, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { env } from "@/lib/env";

/** Singleton Firebase Admin app. Use only on the server. */
function getAdminApp(): App {
  if (getApps().length === 0) {
    const privateKey = env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n");
    
    return initializeApp({
      credential: cert({ 
        projectId: env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey 
      }),
    });
  }
  return getApp();
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminFirestore() {
  return getFirestore(getAdminApp());
}
