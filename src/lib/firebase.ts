// src/lib/firebase.ts

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration - using hardcoded values temporarily
const firebaseConfig = {
  apiKey: "AIzaSyDRsxY4IxKKupGur94xkSQzSQ4QaU3t0Yw",
  authDomain: "syncin-event.firebaseapp.com",
  projectId: "syncin-event",
  storageBucket: "syncin-event.firebasestorage.app",
  messagingSenderId: "807585441723",
  appId: "1:807585441723:web:9204365dffcd7b6b47c69e"
};

console.log('🔥 Firebase initialized with project:', firebaseConfig.projectId);

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Export the app instance
export default app;