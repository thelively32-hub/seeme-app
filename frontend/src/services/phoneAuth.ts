import { Platform } from 'react-native';
import { firebaseConfig } from './firebase';

// Store confirmation result for verification
let confirmationResult: any = null;

/**
 * Send verification code to phone number
 * @param phoneNumber - Full phone number with country code (e.g., +1234567890)
 * @param recaptchaVerifier - reCAPTCHA verifier (required for web only)
 * @returns verification ID or 'native-verification' for native platforms
 */
export const sendVerificationCode = async (
  phoneNumber: string,
  recaptchaVerifier?: any
): Promise<string> => {
  if (Platform.OS === 'web') {
    // Web: Use Firebase JS SDK with reCAPTCHA
    const { initializeApp, getApps, getApp } = require('firebase/app');
    const { getAuth, signInWithPhoneNumber } = require('firebase/auth');
    
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    const auth = getAuth(app);
    
    if (!recaptchaVerifier) {
      throw new Error('reCAPTCHA verifier is required for web platform');
    }
    
    const confirmation = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
    confirmationResult = confirmation;
    return confirmation.verificationId;
  } else {
    // Native: Use React Native Firebase
    const auth = require('@react-native-firebase/auth').default;
    const confirmation = await auth().signInWithPhoneNumber(phoneNumber);
    confirmationResult = confirmation;
    return 'native-verification';
  }
};

/**
 * Verify the SMS code
 * @param code - 6-digit verification code
 * @returns Firebase user object
 */
export const verifyCode = async (code: string): Promise<any> => {
  if (!confirmationResult) {
    throw new Error('No verification session available. Please request a new code.');
  }
  
  const result = await confirmationResult.confirm(code);
  return result.user;
};

/**
 * Get current Firebase user
 */
export const getCurrentUser = () => {
  if (Platform.OS === 'web') {
    const { initializeApp, getApps, getApp } = require('firebase/app');
    const { getAuth } = require('firebase/auth');
    
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    const auth = getAuth(app);
    return auth.currentUser;
  } else {
    const auth = require('@react-native-firebase/auth').default;
    return auth().currentUser;
  }
};

/**
 * Reset verification session
 */
export const resetVerification = () => {
  confirmationResult = null;
};

/**
 * Get stored confirmation result (for direct access if needed)
 */
export const getConfirmationResult = () => confirmationResult;

export default {
  sendVerificationCode,
  verifyCode,
  getCurrentUser,
  resetVerification,
  getConfirmationResult
};
