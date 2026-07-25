import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCXP660HMMAiJ-ASC4hmsXKTKHFIn9oRb4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "readable-app-4d7f5.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "readable-app-4d7f5",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "readable-app-4d7f5.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "402229559463",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:402229559463:web:593907f83ca5f546d45b82",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-RP2Y2YL53N"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
