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
import { LinearGradient } from 'expo-linear-gradient';
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
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            {/* Back Button */}
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={28} color={COLORS.text.primary} />
            </TouchableOpacity>

            {/* Title Section */}
            <View style={styles.titleSection}>
              <Text style={styles.title}>What's your{'\n'}phone number?</Text>
              <Text style={styles.subtitle}>
                We'll send you a verification code to confirm it's you
              </Text>
            </View>

            {/* Phone Input Section */}
            <View style={styles.inputSection}>
              {/* Country Selector */}
              <TouchableOpacity
                style={styles.countrySelector}
                onPress={() => setShowCountryPicker(true)}
              >
                <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                <Text style={styles.countryCode}>{selectedCountry.code}</Text>
                <Ionicons name="chevron-down" size={16} color={COLORS.text.tertiary} />
              </TouchableOpacity>

              {/* Phone Input */}
              <View style={styles.phoneInputContainer}>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="(555) 123-4567"
                  placeholderTextColor={COLORS.text.muted}
                  value={phone}
                  onChangeText={handlePhoneChange}
                  keyboardType="phone-pad"
                  maxLength={14}
                  autoFocus
                  editable={!loading}
                />
                {phone.length > 0 && !loading && (
                  <TouchableOpacity onPress={() => setPhone('')}>
                    <View style={styles.clearButton}>
                      <Ionicons name="close" size={16} color={COLORS.text.tertiary} />
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Security Badge */}
            <View style={styles.securityBadge}>
              <Ionicons name="shield-checkmark" size={16} color={COLORS.gold.primary} />
              <Text style={styles.securityText}>
                Your number is protected and will never be shared
              </Text>
            </View>

            {/* Terms Text */}
            <Text style={styles.termsText}>
              By entering your number, you agree to receive SMS messages for verification. Message and data rates may apply.
            </Text>

            {/* Continue Button */}
            <TouchableOpacity
              style={[styles.continueButton, !canContinue && styles.continueButtonDisabled]}
              onPress={handleContinue}
              disabled={!canContinue}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={canContinue ? ['#FFD700', '#FFC000', '#FFB300'] : ['#3A3A3A', '#2A2A2A']}
                style={styles.continueButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {loading ? (
                  <ActivityIndicator color={canContinue ? '#1A1A1A' : COLORS.text.muted} />
                ) : !recaptchaReady ? (
                  <Text style={styles.continueButtonTextDisabled}>Loading...</Text>
                ) : (
                  <Text style={[styles.continueButtonText, !canContinue && styles.continueButtonTextDisabled]}>
                    Continue
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Or divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or sign in with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Alternative sign in options */}
            <View style={styles.alternativeOptions}>
              <TouchableOpacity
                style={styles.alternativeButton}
                onPress={() => router.back()}
              >
                <Ionicons name="mail-outline" size={20} color={COLORS.text.primary} />
                <Text style={styles.alternativeButtonText}>Email</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Country Picker Modal */}
      <Modal
        visible={showCountryPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <LinearGradient
            colors={[COLORS.background.primary, COLORS.background.secondary]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Country</Text>
            <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
              <Ionicons name="close" size={28} color={COLORS.text.primary} />
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
                  <Ionicons name="checkmark" size={22} color={COLORS.gold.primary} />
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
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    marginLeft: -8,
  },
  titleSection: {
    marginTop: 24,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text.primary,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.text.secondary,
    marginTop: 12,
    lineHeight: 24,
  },
  inputSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.card,
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  countryFlag: {
    fontSize: 20,
  },
  countryCode: {
    fontSize: 16,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  phoneInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.card,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border.gold,
  },
  phoneInput: {
    flex: 1,
    fontSize: 18,
    color: COLORS.text.primary,
    paddingVertical: 16,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  clearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.background.cardHover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
  },
  securityText: {
    fontSize: 13,
    color: COLORS.text.muted,
  },
  termsText: {
    fontSize: 13,
    color: COLORS.text.muted,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  continueButton: {
    borderRadius: 30,
    overflow: 'hidden',
    marginTop: 32,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.gold.bright,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  continueButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: 0.5,
  },
  continueButtonTextDisabled: {
    color: COLORS.text.muted,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border.light,
  },
  dividerText: {
    color: COLORS.text.muted,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  alternativeOptions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    gap: 16,
  },
  alternativeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.card,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  alternativeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text.primary,
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
    borderBottomColor: COLORS.border.light,
    gap: 12,
  },
  countryOptionSelected: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  countryOptionFlag: {
    fontSize: 24,
  },
  countryOptionName: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  countryOptionCode: {
    fontSize: 15,
    color: COLORS.text.secondary,
    marginRight: 8,
  },
});
