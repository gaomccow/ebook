import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCXP660HMMAiJ-ASC4hmsXKTKHFIn9oRb4",
  authDomain: "readable-app-4d7f5.firebaseapp.com",
  projectId: "readable-app-4d7f5",
  storageBucket: "readable-app-4d7f5.firebasestorage.app",
  messagingSenderId: "402229559463",
  appId: "1:402229559463:web:593907f83ca5f546d45b82",
  measurementId: "G-RP2Y2YL53N"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
