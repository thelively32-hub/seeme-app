import { Platform } from 'react-native';

// For web, we use the Firebase JS SDK
// For native (iOS/Android), we use React Native Firebase
let auth: any;
let firebaseApp: any;

if (Platform.OS === 'web') {
  // Web SDK
  const { initializeApp, getApps, getApp } = require('firebase/app');
  const { getAuth } = require('firebase/auth');
  
  const firebaseConfig = {
    apiKey: "AIzaSyDmH6FKtn9loWwyqz0zOiKrssdCXfz7Ceo",
    authDomain: "see-me-app-5e487.firebaseapp.com",
    projectId: "see-me-app-5e487",
    storageBucket: "see-me-app-5e487.firebasestorage.app",
    messagingSenderId: "5904630206",
    appId: "1:5904630206:web:feecd66c5bcb713586f9ef"
  };
  
  firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(firebaseApp);
} else {
  // Native SDK (iOS/Android)
  const firebaseNative = require('@react-native-firebase/app').default;
  const authNative = require('@react-native-firebase/auth').default;
  
  firebaseApp = firebaseNative;
  auth = authNative();
}

export { auth, firebaseApp };

// Firebase configuration for reference
export const firebaseConfig = {
  apiKey: "AIzaSyDmH6FKtn9loWwyqz0zOiKrssdCXfz7Ceo",
  authDomain: "see-me-app-5e487.firebaseapp.com",
  projectId: "see-me-app-5e487",
  storageBucket: "see-me-app-5e487.firebasestorage.app",
  messagingSenderId: "5904630206",
  appId: "1:5904630206:web:feecd66c5bcb713586f9ef"
};

// Phone Auth Helper Functions
export const verifyPhoneCode = async (verificationId: string, code: string) => {
  if (Platform.OS === 'web') {
    const { PhoneAuthProvider, signInWithCredential } = require('firebase/auth');
    const credential = PhoneAuthProvider.credential(verificationId, code);
    const userCredential = await signInWithCredential(auth, credential);
    return userCredential.user;
  } else {
    // Native: verificationId is the confirmation object
    // This will be handled differently in the phone screen
    return null;
  }
};

export const signOutFirebase = async () => {
  if (Platform.OS === 'web') {
    const { signOut } = require('firebase/auth');
    await signOut(auth);
  } else {
    await auth.signOut();
  }
};

export default firebaseApp;
