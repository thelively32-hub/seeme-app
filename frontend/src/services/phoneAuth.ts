import { auth, verifyPhoneCode, signOutFirebase } from './firebase';
import { PhoneAuthProvider, RecaptchaVerifier, signInWithPhoneNumber, ApplicationVerifier } from 'firebase/auth';
import api from './api';

// Store verification ID for OTP confirmation
let currentVerificationId: string | null = null;
let recaptchaVerifier: ApplicationVerifier | null = null;

// For web - we need a visible reCAPTCHA
export const initRecaptchaVerifier = (containerId: string = 'recaptcha-container'): RecaptchaVerifier | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'normal',
      callback: () => {
        console.log('reCAPTCHA solved');
      },
      'expired-callback': () => {
        console.log('reCAPTCHA expired');
      }
    });
    return recaptchaVerifier as RecaptchaVerifier;
  } catch (error) {
    console.error('Error initializing reCAPTCHA:', error);
    return null;
  }
};

// Send OTP to phone number
export const sendOTP = async (
  phoneNumber: string, 
  appVerifier: ApplicationVerifier
): Promise<string> => {
  try {
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
    currentVerificationId = confirmationResult.verificationId;
    return confirmationResult.verificationId;
  } catch (error: any) {
    console.error('Error sending OTP:', error);
    throw new Error(error.message || 'Failed to send verification code');
  }
};

// Verify OTP code
export const verifyOTP = async (code: string): Promise<any> => {
  if (!currentVerificationId) {
    throw new Error('No verification in progress. Please request a new code.');
  }
  
  try {
    const user = await verifyPhoneCode(currentVerificationId, code);
    
    // Get Firebase ID token to authenticate with our backend
    const idToken = await user.getIdToken();
    
    // Sync with our backend - create or login user
    const backendResponse = await api.firebaseAuth(idToken, user.phoneNumber || '');
    
    currentVerificationId = null;
    return {
      firebaseUser: user,
      backendUser: backendResponse.user,
      isNewUser: backendResponse.is_new_user,
    };
  } catch (error: any) {
    console.error('Error verifying OTP:', error);
    if (error.code === 'auth/invalid-verification-code') {
      throw new Error('Invalid verification code. Please try again.');
    }
    throw new Error(error.message || 'Verification failed');
  }
};

// Sign out from Firebase and backend
export const signOutPhone = async () => {
  await signOutFirebase();
  await api.logout();
  currentVerificationId = null;
};

// Check if verification is in progress
export const hasActiveVerification = () => {
  return currentVerificationId !== null;
};

// Clear verification state
export const clearVerification = () => {
  currentVerificationId = null;
};
