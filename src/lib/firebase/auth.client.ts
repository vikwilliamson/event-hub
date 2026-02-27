"use client";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  type UserCredential,
} from "firebase/auth";
import { getFirebaseAuth } from "./client";

export async function signIn(email: string, password: string): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signUp(email: string, password: string): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function sendResetPasswordEmail(email: string): Promise<void> {
  const auth = getFirebaseAuth();
  return sendPasswordResetEmail(auth, email);
}

export async function getIdToken(forceRefresh = false): Promise<string | null> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken(forceRefresh);
}
