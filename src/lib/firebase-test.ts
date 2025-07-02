// src/lib/firebase-test.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const testConfig = {
  apiKey: "AIzaSyDRsxY4IxKKupGur94xkSQzSQ4QaU3t0Yw",
  authDomain: "syncin-event.firebaseapp.com",
  projectId: "syncin-event", 
  storageBucket: "syncin-event.firebasestorage.app",
  messagingSenderId: "807585441723",
  appId: "1:807585441723:web:9204365dffcd7b6b47c69e"
};

export const testApp = initializeApp(testConfig, 'test');
export const testDb = getFirestore(testApp);