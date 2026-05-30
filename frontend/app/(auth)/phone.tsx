import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDmH6FKtn9loWwyqz0zOiKrssdCXfz7Ceo",
  authDomain: "see-me-app-5e487.firebaseapp.com",
  projectId: "see-me-app-5e487",
  storageBucket: "see-me-app-5e487.firebasestorage.app",
  messagingSenderId: "5904630206",
  appId: "1:5904630206:web:feecd66c5bcb713586f9ef",
  measurementId: "G-7BBQ01WKLX"
};

const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const firebaseAuth = getAuth(firebaseApp);

const COUNTRIES = [
  { code: '+1', flag: '🇺🇸', name: 'United States', abbr: 'US' },
  { code: '+34', flag: '🇪🇸', name: 'Spain', abbr: 'ES' },
  { code: '+44', flag: '🇬🇧', name: 'United Kingdom', abbr: 'UK' },
  { code: '+52', flag: '🇲🇽', name: 'Mexico', abbr: 'MX' },
  { code: '+57', flag: '🇨🇴', name: 'Colombia', abbr: 'CO' },
  { code: '+54', flag: '🇦🇷', name: 'Argentina', abbr: 'AR' },
  { code: '+55', flag: '🇧🇷', name: 'Brazil', abbr: 'BR' },
  { code: '+33', flag: '🇫🇷', name: 'France', abbr: 'FR' },
  { code: '+49', flag: '🇩🇪', name: 'Germany', abbr: 'DE' },
  { code: '+39', flag: '🇮🇹', name: 'Italy', abbr: 'IT' },
];

let globalConfirmationResult: any = null;
export const getConfirmationResult = () => globalConfirmationResult;
export const setConfirmationResult = (result: any) => { globalConfirmationResult = result; };
export const clearConfirmationResult = () => { globalConfirmationResult = null; };

export default function PhoneScreen() {
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recaptchaReady, setRecaptchaReady] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    if (Platform.OS === 'web') {
      initRecaptchaWeb();
    } else {
      setRecaptchaReady(true);
    }

    return () => {
      if (Platform.OS === 'web' && recaptchaRef.current) {
        try { recaptchaRef.current.clear(); } catch (e) {}
      }
    };
  }, []);

  const initRecaptchaWeb = async () => {
    try {
      let container = document.getElementById('recaptcha-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'recaptcha-container';
        container.style.position = 'fixed';
        container.style.bottom = '10px';
        container.style.left = '50%';
        container.style.transform = 'translateX(-50%)';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
      }

      recaptchaRef.current = new RecaptchaVerifier(firebaseAuth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => { console.log('reCAPTCHA verified'); },
        'expired-callback': () => {
          setRecaptchaReady(false);
          initRecaptchaWeb();
        }
      });

      await recaptchaRef.current.render();
      setRecaptchaReady(true);
    } catch (error) {
      console.error('reCAPTCHA init error:', error);
      setRecaptchaReady(true);
    }
  };

  const handlePhoneChange = (text: string) => {
    // Only allow numbers
    const cleaned = text.replace(/\D/g, '');
    setPhone(cleaned);
  };

  const handleContinue = async () => {
    if (phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    const fullPhone = `${selectedCountry.code}${phone}`;
    setLoading(true);

    try {
      const confirmation = await signInWithPhoneNumber(
        firebaseAuth,
        fullPhone,
        recaptchaRef.current!
      );
      globalConfirmationResult = confirmation;
      router.push({
        pathname: '/(auth)/verify',
        params: { phone: fullPhone }
      });
    } catch (error: any) {
      console.error('Phone auth error:', error);
      handleAuthError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthError = (error: any) => {
    let message = 'Failed to send verification code. Please try again.';
    if (error.code === 'auth/invalid-phone-number') {
      message = 'Invalid phone number format. Please check and try again.';
    } else if (error.code === 'auth/too-many-requests') {
      message = 'Too many attempts. Please try again later.';
    } else if (error.code === 'auth/quota-exceeded') {
      message = 'SMS quota exceeded. Please try again later.';
    } else if (error.code === 'auth/captcha-check-failed') {
      message = 'reCAPTCHA verification failed. Please refresh and try again.';
    } else if (error.code === 'auth/network-request-failed') {
      message = 'Network error. Please check your connection and try again.';
    } else if (error.message) {
      message = error.message;
    }
    Alert.alert('Error', message);
  };

  const handleKeypadPress = (digit: string) => {
    if (phone.length < 10) {
      setPhone(prev => prev + digit);
    }
  };

  const handleBackspace = () => {
    setPhone(prev => prev.slice(0, -1));
  };

  const isValidPhone = phone.length >= 10;
  const canContinue = isValidPhone && recaptchaReady && !loading;

  // Format display phone number
  const formatDisplayPhone = (num: string) => {
    if (num.length === 0) return '';
    if (num.length <= 3) return num;
    if (num.length <= 6) return `${num.slice(0, 3)} ${num.slice(3)}`;
    return `${num.slice(0, 3)} ${num.slice(3, 6)} ${num.slice(6)}`;
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <Animated.View
          style={[
            styles.content,
            {
              paddingTop: insets.top + 10,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="#1A1A1A" />
          </TouchableOpacity>

          {/* Title */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>Can we get{'\n'}your number?</Text>
          </View>

          {/* Phone Input Section */}
          <View style={styles.inputSection}>
            {/* Country Selector */}
            <TouchableOpacity
              style={styles.countrySelector}
              onPress={() => setShowCountryPicker(true)}
            >
              <Text style={styles.countryText}>
                {selectedCountry.abbr} {selectedCountry.code}
              </Text>
              <Ionicons name="caret-down" size={12} color="#1A1A1A" />
            </TouchableOpacity>

            {/* Phone Number Display */}
            <View style={styles.phoneInputContainer}>
              <Text style={[
                styles.phoneDisplay,
                phone.length === 0 && styles.phoneDisplayPlaceholder
              ]}>
                {phone.length > 0 ? formatDisplayPhone(phone) : ''}
              </Text>
              <View style={styles.cursor} />
            </View>
          </View>

          {/* Divider line under inputs */}
          <View style={styles.inputDividerContainer}>
            <View style={styles.countryDivider} />
            <View style={styles.phoneDivider} />
          </View>

          {/* Terms Text */}
          <View style={styles.termsSection}>
            <Text style={styles.termsText}>
              By entering your number, you agree to get texts about your account, like verification codes, account alerts, reminders, and updates (e.g. Likes, matches, unread messages).
            </Text>
            <Text style={styles.termsTextSecondary}>
              Message frequency varies and data rates may apply. Reply STOP to cancel.
            </Text>
          </View>

          {/* Next Button */}
          <TouchableOpacity
            style={[styles.nextButton, canContinue && styles.nextButtonActive]}
            onPress={handleContinue}
            disabled={!canContinue}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={canContinue ? '#1A1A1A' : '#9CA3AF'} />
            ) : (
              <Text style={[styles.nextButtonText, canContinue && styles.nextButtonTextActive]}>
                Next
              </Text>
            )}
          </TouchableOpacity>

          {/* Custom Keypad */}
          <View style={[styles.keypad, { paddingBottom: insets.bottom + 10 }]}>
            <View style={styles.keypadRow}>
              {[
                { digit: '1', letters: '' },
                { digit: '2', letters: 'ABC' },
                { digit: '3', letters: 'DEF' },
              ].map((key) => (
                <TouchableOpacity
                  key={key.digit}
                  style={styles.keypadButton}
                  onPress={() => handleKeypadPress(key.digit)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.keypadDigit}>{key.digit}</Text>
                  {key.letters ? <Text style={styles.keypadLetters}>{key.letters}</Text> : null}
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.keypadRow}>
              {[
                { digit: '4', letters: 'GHI' },
                { digit: '5', letters: 'JKL' },
                { digit: '6', letters: 'MNO' },
              ].map((key) => (
                <TouchableOpacity
                  key={key.digit}
                  style={styles.keypadButton}
                  onPress={() => handleKeypadPress(key.digit)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.keypadDigit}>{key.digit}</Text>
                  {key.letters ? <Text style={styles.keypadLetters}>{key.letters}</Text> : null}
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.keypadRow}>
              {[
                { digit: '7', letters: 'PQRS' },
                { digit: '8', letters: 'TUV' },
                { digit: '9', letters: 'WXYZ' },
              ].map((key) => (
                <TouchableOpacity
                  key={key.digit}
                  style={styles.keypadButton}
                  onPress={() => handleKeypadPress(key.digit)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.keypadDigit}>{key.digit}</Text>
                  {key.letters ? <Text style={styles.keypadLetters}>{key.letters}</Text> : null}
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.keypadRow}>
              <View style={styles.keypadButtonEmpty} />
              <TouchableOpacity
                style={styles.keypadButton}
                onPress={() => handleKeypadPress('0')}
                activeOpacity={0.6}
              >
                <Text style={styles.keypadDigit}>0</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.keypadButtonBackspace}
                onPress={handleBackspace}
                activeOpacity={0.6}
              >
                <Ionicons name="backspace-outline" size={28} color="#1A1A1A" />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* Country Picker Modal */}
      <Modal
        visible={showCountryPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Country</Text>
            <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
              <Ionicons name="close" size={28} color="#1A1A1A" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.countryList}>
            {COUNTRIES.map((country) => (
              <TouchableOpacity
                key={country.code}
                style={[
                  styles.countryOption,
                  selectedCountry.code === country.code && styles.countryOptionSelected,
                ]}
                onPress={() => {
                  setSelectedCountry(country);
                  setShowCountryPicker(false);
                }}
              >
                <Text style={styles.countryOptionFlag}>{country.flag}</Text>
                <Text style={styles.countryOptionName}>{country.name}</Text>
                <Text style={styles.countryOptionCode}>{country.code}</Text>
                {selectedCountry.code === country.code && (
                  <Ionicons name="checkmark" size={22} color="#FFD700" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    marginLeft: -8,
  },
  titleSection: {
    marginTop: 20,
    marginBottom: 40,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#1A1A1A',
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  inputSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 12,
  },
  countryText: {
    fontSize: 17,
    fontWeight: '400',
    color: '#1A1A1A',
  },
  phoneInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    minHeight: 40,
  },
  phoneDisplay: {
    fontSize: 17,
    color: '#1A1A1A',
    fontWeight: '400',
    letterSpacing: 1,
  },
  phoneDisplayPlaceholder: {
    color: '#9CA3AF',
  },
  cursor: {
    width: 2,
    height: 24,
    backgroundColor: '#FFD700',
    marginLeft: 2,
  },
  inputDividerContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  countryDivider: {
    width: 80,
    height: 1,
    backgroundColor: '#D1D5DB',
  },
  phoneDivider: {
    flex: 1,
    height: 1,
    backgroundColor: '#D1D5DB',
  },
  termsSection: {
    marginTop: 24,
  },
  termsText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
  },
  termsTextSecondary: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
    marginTop: 16,
  },
  nextButton: {
    backgroundColor: '#E5E7EB',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  nextButtonActive: {
    backgroundColor: '#FFD700',
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  nextButtonTextActive: {
    color: '#1A1A1A',
  },
  keypad: {
    marginTop: 'auto',
    backgroundColor: '#E8E8E8',
    marginHorizontal: -24,
    paddingHorizontal: 8,
    paddingTop: 8,
    zIndex: 100,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  keypadButton: {
    width: 110,
    height: 54,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  keypadButtonEmpty: {
    width: 110,
    height: 54,
    marginHorizontal: 4,
  },
  keypadButtonBackspace: {
    width: 110,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  keypadDigit: {
    fontSize: 28,
    fontWeight: '400',
    color: '#1A1A1A',
  },
  keypadLetters: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 2,
    marginTop: 2,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  countryList: {
    flex: 1,
  },
  countryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  countryOptionSelected: {
    backgroundColor: '#FEF9C3',
  },
  countryOptionFlag: {
    fontSize: 24,
  },
  countryOptionName: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  countryOptionCode: {
    fontSize: 15,
    color: '#6B7280',
    marginRight: 8,
  },
});
