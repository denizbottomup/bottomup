'use client';

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  OAuthProvider,
  browserLocalPersistence,
  getAuth,
  setPersistence,
  signInWithPopup,
  type Auth,
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import {
  getMessaging,
  getToken,
  isSupported as isMessagingSupported,
  onMessage,
  type Messaging,
  type MessagePayload,
} from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let messaging: Messaging | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (app) return app;
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return app;
}

export function getFirebaseAuth(): Auth {
  if (auth) return auth;
  auth = getAuth(getFirebaseApp());
  // Persist across tabs/reloads; swallowed if already set.
  void setPersistence(auth, browserLocalPersistence).catch(() => {});
  return auth;
}

export function getFirestoreDb(): Firestore {
  if (db) return db;
  db = getFirestore(getFirebaseApp());
  return db;
}

/**
 * Try to get a FCM web-push token. Returns null if the browser does not
 * support messaging or if the user declines the permission prompt. The
 * caller is responsible for posting the token to the API.
 *
 * Requires NEXT_PUBLIC_FIREBASE_VAPID_KEY to be set; the project owner
 * configures this in the Firebase Console → Cloud Messaging → Web push
 * certificates.
 */
export async function requestFcmToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const supported = await isMessagingSupported().catch(() => false);
  if (!supported) return null;
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;
    if (!messaging) messaging = getMessaging(getFirebaseApp());
    const token = await getToken(messaging, { vapidKey });
    return token || null;
  } catch {
    return null;
  }
}

export function onForegroundMessage(
  handler: (payload: MessagePayload) => void,
): () => void {
  if (typeof window === 'undefined') return () => undefined;
  if (!messaging) {
    try {
      messaging = getMessaging(getFirebaseApp());
    } catch {
      return () => undefined;
    }
  }
  return onMessage(messaging, handler);
}

export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider('apple.com');

export async function signInWithGoogle(): Promise<void> {
  const a = getFirebaseAuth();
  await signInWithPopup(a, googleProvider);
}

export async function signInWithApple(): Promise<void> {
  const a = getFirebaseAuth();
  await signInWithPopup(a, appleProvider);
}
