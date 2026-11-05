import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from 'firebase/auth';
import { Platform } from 'react-native';

// Import the functions you need from the SDKs you need
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAtYcGSxiQmFpfbI5glvgg7B98eaz-NP-k",
  authDomain: "quiz4-f3550.firebaseapp.com",
  projectId: "quiz4-f3550",
  storageBucket: "quiz4-f3550.firebasestorage.app",
  messagingSenderId: "667162101960",
  appId: "1:667162101960:web:434da2f92b738d16e9fdfd",
  measurementId: "G-DVX6GPL99M"
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth with persistent storage
let auth;
if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (_error) {
    // Fallback if already initialized
    auth = getAuth(app);
  }
}

export { app, auth, firebaseConfig };
