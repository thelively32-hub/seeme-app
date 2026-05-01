import { Platform } from 'react-native';

// Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyDmH6FKtn9loWwyqz0zOiKrssdCXfz7Ceo",
  authDomain: "see-me-app-5e487.firebaseapp.com",
  projectId: "see-me-app-5e487",
  storageBucket: "see-me-app-5e487.firebasestorage.app",
  messagingSenderId: "5904630206",
  appId: "1:5904630206:web:feecd66c5bcb713586f9ef"
};

// Get the appropriate auth instance based on platform
export const getAuth = () => {
  if (Platform.OS === 'web') {
    const { initializeApp, getApps, getApp } = require('firebase/app');
    const { getAuth: getWebAuth } = require('firebase/auth');
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    return getWebAuth(app);
  } else {
    const auth = require('@react-native-firebase/auth').default;
    return auth();
  }
};

// Sign out from Firebase
export const signOutFirebase = async () => {
  if (Platform.OS === 'web') {
    const { signOut } = require('firebase/auth');
    const auth = getAuth();
    await signOut(auth);
  } else {
    const auth = require('@react-native-firebase/auth').default;
    await auth().signOut();
  }
};

// Get current user
export const getCurrentUser = () => {
  const auth = getAuth();
  return auth.currentUser;
};

// Get ID token for backend authentication
export const getIdToken = async (): Promise<string | null> => {
  const user = getCurrentUser();
  if (user) {
    return await user.getIdToken();
  }
  return null;
};

export default { getAuth, signOutFirebase, getCurrentUser, getIdToken, firebaseConfig };
