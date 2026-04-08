import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
// @ts-expect-error - getReactNativePersistence is not exported in some environments but is available at runtime in RN
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// These should ideally be in a .env file
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'PLACEHOLDER',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'PLACEHOLDER',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'PLACEHOLDER',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'PLACEHOLDER',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || 'PLACEHOLDER',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || 'PLACEHOLDER',
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || 'PLACEHOLDER'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage as any)
});

// Initialize Cloud Firestore if needed (though not required for Drive backup)
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
