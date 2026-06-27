import { Platform } from 'react-native';

// Firebase web SDK config - only used on web platform
// On native (iOS/Android), @react-native-firebase/auth handles auth directly
export const firebaseConfig = {
  apiKey: "AIzaSyDmH6FKtn9loWwyqz0zOiKrssdCXfz7Ceo",
  authDomain: "see-me-app-5e487.firebaseapp.com",
  projectId: "see-me-app-5e487",
  storageBucket: "see-me-app-5e487.firebasestorage.app",
  messagingSenderId: "5904630206",
  appId: "1:5904630206:web:feecd66c5bcb713586f9ef"
};

// Lazy-initialize web Firebase only on web platform
// This prevents the web SDK from loading on native and causing startup crashes
let _app: any = null;
let _auth: any = null;

export const getFirebaseApp = () => {
  if (Platform.OS !== 'web') return null;
  if (_app) return _app;
  try {
    const { initializeApp, getApps, getApp } = require('firebase/app');
    _app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  } catch (e) {
    console.warn('Firebase web app init failed:', e);
  }
  return _app;
};

// Legacy export for analytics.ts (web only)
export const firebaseApp = Platform.OS === 'web' ? getFirebaseApp() : null;

export const getAuth = () => {
  if (Platform.OS !== 'web') return null;
  if (_auth) return _auth;
  try {
    const { getAuth: _getAuth } = require('firebase/auth');
    _auth = _getAuth(getFirebaseApp());
  } catch (e) {
    console.warn('Firebase web auth init failed:', e);
  }
  return _auth;
};

export const signOutFirebase = async () => {
  if (Platform.OS !== 'web') return;
  try {
    const { signOut } = require('firebase/auth');
    await signOut(getAuth());
  } catch (e) {
    console.warn('Firebase signOut failed:', e);
  }
};

export const getCurrentUser = () => {
  if (Platform.OS !== 'web') return null;
  const auth = getAuth();
  return auth?.currentUser || null;
};

export const getIdToken = async (): Promise<string | null> => {
  if (Platform.OS !== 'web') return null;
  const user = getCurrentUser();
  if (user) return await user.getIdToken();
  return null;
};

export default { getAuth, signOutFirebase, getCurrentUser, getIdToken, firebaseConfig };
