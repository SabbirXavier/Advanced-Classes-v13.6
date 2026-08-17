import {
  initializeApp,
  getApp,
  getApps,
  FirebaseApp,
  type FirebaseOptions,
} from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";
import { getAnalytics } from "firebase/analytics";

// ✅ Config type with firestoreDatabaseId
type FirebaseConfig = FirebaseOptions & {
  firestoreDatabaseId?: string;
};

// Use environment variables from Secrets (VITE_ prefix for client-side)
const firebaseConfig: FirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID,
};

// ✅ Initialize Primary Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Check for placeholders in production
if (import.meta.env.PROD) {
  const placeholders = [
    "remixed-project-id",
    "remixed-app-id",
    "remixed-api-key",
  ];
  if (
    placeholders.includes(firebaseConfig.projectId || "") ||
    !firebaseConfig.apiKey
  ) {
    console.error(
      "⚠️ FIREBASE CONFIGURATION MISSING OR USING PLACEHOLDERS. Please set your VITE_FIREBASE_* environment variables in your hosting provider (e.g. Render).",
    );
  }
}

// ✅ Services
export const auth = getAuth(app);
export const db = typeof window !== "undefined"
  ? initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true
    }, firebaseConfig.firestoreDatabaseId)
  : firebaseConfig.firestoreDatabaseId
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);

export const rtdb = import.meta.env.VITE_FIREBASE_DATABASE_URL
  ? getDatabase(app)
  : null;
export const storage = getStorage(app);

export const primaryConfig = firebaseConfig;

// ✅ Analytics (safe for SSR)
let analytics;
if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
}
export { analytics };

// ✅ Helper for secondary apps (cleaned type)
export const initializeSecondaryApp = (
  name: string,
  config: FirebaseOptions,
): FirebaseApp => {
  const existing = getApps().find((app) => app.name === name);
  return existing ? getApp(name) : initializeApp(config, name);
};

export default app;
