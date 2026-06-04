import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth as getFirebaseAuth, signOut, Auth } from 'firebase/auth';

// Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyDmH6FKtn9loWwyqz0zOiKrssdCXfz7Ceo",
  authDomain: "see-me-app-5e487.firebaseapp.com",
  projectId: "see-me-app-5e487",
  storageBucket: "see-me-app-5e487.firebasestorage.app",
  messagingSenderId: "5904630206",
  appId: "1:5904630206:web:feecd66c5bcb713586f9ef"
};

// Initialize Firebase app
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Get the auth instance
export const getAuth = (): Auth => {
  return getFirebaseAuth(app);
};

// Sign out from Firebase
export const signOutFirebase = async () => {
  const auth = getAuth();
  await signOut(auth);
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
