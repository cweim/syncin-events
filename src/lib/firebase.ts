// src/lib/firebase.ts
// Version: 2.0 - Enhanced Firebase configuration with proper Storage setup

import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

// Firebase configuration - using environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

console.log('🔥 Firebase initialized with project:', firebaseConfig.projectId);
console.log('📦 Storage bucket:', firebaseConfig.storageBucket);

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Optional: Connect to emulators in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Only run emulator connection on client side and in development
  const isEmulatorConnected = localStorage.getItem('firebase-emulator-connected');
  
  if (!isEmulatorConnected) {
    try {
      // Uncomment these lines if you want to use Firebase emulators in development
      // connectAuthEmulator(auth, 'http://localhost:9099');
      // connectFirestoreEmulator(db, 'localhost', 8080);
      // connectStorageEmulator(storage, 'localhost', 9199);
      
      localStorage.setItem('firebase-emulator-connected', 'true');
      console.log('🔧 Firebase emulators connected (if enabled)');
    } catch (error) {
      console.log('🔧 Emulators not available or already connected');
    }
  }
}

// Test storage connection
if (typeof window !== 'undefined') {
  // Test if storage is accessible
  import('firebase/storage').then(({ ref, getDownloadURL }) => {
    try {
      const testRef = ref(storage, 'test-connection');
      console.log('📦 Storage connection test:', testRef.toString());
    } catch (error) {
      console.error('❌ Storage connection error:', error);
    }
  });
}

// Export the app instance
export default app;