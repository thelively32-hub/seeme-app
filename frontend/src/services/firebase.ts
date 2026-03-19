import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, PhoneAuthProvider, signInWithCredential, signOut } from 'firebase/auth';

// Firebase configuration from user
const firebaseConfig = {
  apiKey: "AIzaSyDmH6FKtn9loWwyqz0zOiKrssdCXfz7Ceo",
  authDomain: "see-me-app-5e487.firebaseapp.com",
  projectId: "see-me-app-5e487",
  storageBucket: "see-me-app-5e487.firebasestorage.app",
  messagingSenderId: "5904630206",
  appId: "1:5904630206:web:feecd66c5bcb713586f9ef"
};

// Initialize Firebase (singleton pattern)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Export Firebase app for recaptcha
export const firebaseApp = app;
export { firebaseConfig };

// Phone Auth Helper Functions
export const verifyPhoneCode = async (verificationId: string, code: string) => {
  const credential = PhoneAuthProvider.credential(verificationId, code);
  const userCredential = await signInWithCredential(auth, credential);
  return userCredential.user;
};

export const signOutFirebase = async () => {
  await signOut(auth);
};

export default app;
