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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'react-native-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../../src/theme/colors';

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

// Web SDK only for web platform
const firebaseApp = Platform.OS === 'web'
  ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApp())
  : null;
const firebaseAuth = Platform.OS === 'web' ? getAuth(firebaseApp!) : null;

const COUNTRIES = [
  { code: '+1', flag: '🇺🇸', name: 'US' },
  { code: '+34', flag: '🇪🇸', name: 'ES' },
  { code: '+44', flag: '🇬🇧', name: 'UK' },
  { code: '+52', flag: '🇲🇽', name: 'MX' },
  { code: '+57', flag: '🇨🇴', name: 'CO' },
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
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    if (Platform.OS === 'web') {
      initRecaptchaWeb();
    } else {
      // On native, Firebase web SDK will handle verification
      // reCAPTCHA is not needed for native phone auth flow
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
      // Hide existing recaptcha containers
      const existingBadge = document.querySelector('.grecaptcha-badge') as HTMLElement;
      if (existingBadge) {
        existingBadge.style.visibility = 'hidden';
      }

      let container = document.getElementById('recaptcha-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'recaptcha-container';
        container.style.position = 'absolute';
        container.style.visibility = 'hidden';
        container.style.opacity = '0';
        container.style.pointerEvents = 'none';
        document.body.appendChild(container);
      }

      recaptchaRef.current = new RecaptchaVerifier(firebaseAuth!, 'recaptcha-container', {
        size: 'invisible',
        callback: () => { console.log('reCAPTCHA verified'); },
        'expired-callback': () => {
          setRecaptchaReady(false);
          initRecaptchaWeb();
        }
      });

      await recaptchaRef.current.render();
      
      // Hide the badge after render
      setTimeout(() => {
        const badge = document.querySelector('.grecaptcha-badge') as HTMLElement;
        if (badge) {
          badge.style.visibility = 'hidden';
          badge.style.opacity = '0';
        }
      }, 100);
      
      setRecaptchaReady(true);
    } catch (error) {
      console.error('reCAPTCHA init error:', error);
      setRecaptchaReady(true);
    }
  };

  const formatPhone = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  };

  const handlePhoneChange = (text: string) => {
    setPhone(formatPhone(text));
  };

  const handleContinue = async () => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    const fullPhone = `${selectedCountry.code}${cleanPhone}`;
    setLoading(true);

    try {
      if (Platform.OS === 'web') {
        // Web: Use reCAPTCHA
        if (!recaptchaRef.current) {
          throw new Error('reCAPTCHA not initialized');
        }
        const confirmation = await signInWithPhoneNumber(
          firebaseAuth!,
          fullPhone,
          recaptchaRef.current
        );
        globalConfirmationResult = confirmation;
        router.push({
          pathname: '/(auth)/verify',
          params: { phone: fullPhone }
        });
      } else {
        // iOS/Android: Use @react-native-firebase/auth
        // This uses APNs silent push for verification - no reCAPTCHA needed
        const nativeAuth = require('@react-native-firebase/auth').default;
        const confirmation = await nativeAuth().signInWithPhoneNumber(fullPhone);
        globalConfirmationResult = confirmation;
        router.push({
          pathname: '/(auth)/verify',
          params: { phone: fullPhone }
        });
      }
    } catch (error: any) {
      console.error('Phone auth error:', error);
      let message = 'Failed to send code. Please try again.';
      if (error.code === 'auth/invalid-phone-number') {
        message = 'Invalid phone number format.';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Too many attempts. Please try again later.';
      } else if (error.code === 'auth/missing-client-identifier') {
        message = 'Phone authentication requires app verification. Please try again.';
      } else if (error.message) {
        message = error.message;
      }
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const isValidPhone = phone.replace(/\D/g, '').length >= 10;
  const canContinue = isValidPhone && recaptchaReady && !loading;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.background.primary, COLORS.background.secondary]}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <Animated.View
          style={[
            styles.content,
            {
              paddingTop: insets.top + 16,
              paddingBottom: insets.bottom + 20,
              opacity: fadeAnim,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={28} color={COLORS.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Title */}
          <Text style={styles.title}>Enter your{'\n'}phone number</Text>
          <Text style={styles.subtitle}>We'll send you a verification code</Text>

          {/* Input Row */}
          <View style={styles.inputRow}>
            <TouchableOpacity
              style={styles.countryButton}
              onPress={() => setShowCountryPicker(!showCountryPicker)}
            >
              <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
              <Text style={styles.countryCode}>{selectedCountry.code}</Text>
              <Ionicons name="chevron-down" size={14} color={COLORS.text.muted} />
            </TouchableOpacity>

            <TextInput
              style={styles.phoneInput}
              placeholder="(555) 123-4567"
              placeholderTextColor={COLORS.text.muted}
              value={phone}
              onChangeText={handlePhoneChange}
              keyboardType="phone-pad"
              maxLength={14}
              autoFocus
            />
          </View>

          {/* Country Picker Dropdown */}
          {showCountryPicker && (
            <View style={styles.countryDropdown}>
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
                  <Text style={styles.countryFlag}>{country.flag}</Text>
                  <Text style={styles.countryOptionText}>{country.name}</Text>
                  <Text style={styles.countryOptionCode}>{country.code}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Spacer */}
          <View style={{ flex: 1 }} />

          {/* Continue Button */}
          <TouchableOpacity
            style={[styles.continueButton, !canContinue && styles.continueButtonDisabled]}
            onPress={handleContinue}
            disabled={!canContinue}
          >
            {loading ? (
              <ActivityIndicator color="#1A1A1A" />
            ) : (
              <Text style={[styles.continueText, !canContinue && styles.continueTextDisabled]}>
                Continue
              </Text>
            )}
          </TouchableOpacity>

          {/* Terms */}
          <Text style={styles.terms}>
            By continuing, you agree to receive SMS verification messages
          </Text>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 32,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    marginLeft: -8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 8,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.text.secondary,
    marginBottom: 32,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  countryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.card,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  countryFlag: {
    fontSize: 18,
  },
  countryCode: {
    fontSize: 15,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    backgroundColor: COLORS.background.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    fontSize: 17,
    color: COLORS.text.primary,
    borderWidth: 1,
    borderColor: COLORS.border.gold,
  },
  countryDropdown: {
    marginTop: 8,
    backgroundColor: COLORS.background.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
  },
  countryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 10,
  },
  countryOptionSelected: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
  },
  countryOptionText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text.primary,
  },
  countryOptionCode: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  continueButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
    marginBottom: 16,
  },
  continueButtonDisabled: {
    backgroundColor: '#333',
  },
  continueText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  continueTextDisabled: {
    color: '#666',
  },
  terms: {
    fontSize: 12,
    color: COLORS.text.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
