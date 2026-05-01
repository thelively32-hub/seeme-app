import { Platform } from 'react-native';
import { auth } from './firebase';

// Store confirmation result for native
let confirmationResult: any = null;

export const sendVerificationCode = async (phoneNumber: string, recaptchaVerifier?: any): Promise<string> => {
  if (Platform.OS === 'web') {
    // Web: Use Firebase JS SDK with reCAPTCHA
    const { signInWithPhoneNumber } = require('firebase/auth');
    const confirmation = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
    confirmationResult = confirmation;
    return confirmation.verificationId;
  } else {
    // Native: Use React Native Firebase
    const confirmation = await auth.signInWithPhoneNumber(phoneNumber);
    confirmationResult = confirmation;
    return 'native-verification';
  }
};

export const verifyCode = async (verificationId: string, code: string): Promise<any> => {
  if (Platform.OS === 'web') {
    // Web: Use the confirmation result
    if (confirmationResult) {
      const result = await confirmationResult.confirm(code);
      return result.user;
    }
    throw new Error('No confirmation result available');
  } else {
    // Native: Use the stored confirmation object
    if (confirmationResult) {
      const result = await confirmationResult.confirm(code);
      return result.user;
    }
    throw new Error('No confirmation result available');
  }
};

export const getCurrentUser = () => {
  if (Platform.OS === 'web') {
    return auth.currentUser;
  } else {
    return auth.currentUser;
  }
};

export const resetVerification = () => {
  confirmationResult = null;
};
