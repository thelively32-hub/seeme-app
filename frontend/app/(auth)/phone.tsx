$content = @'
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Animated,
  Easing,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
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

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

const COUNTRIES = [
  { code: '+1', flag: '🇺🇸', name: 'USA' },
  { code: '+34', flag: '🇪🇸', name: 'Spain' },
  { code: '+44', flag: '🇬🇧', name: 'UK' },
  { code: '+52', flag: '🇲🇽', name: 'Mexico' },
  { code: '+57', flag: '🇨🇴', name: 'Colombia' },
  { code: '+54', flag: '🇦🇷', name: 'Argentina' },
];

let globalConfirmationResult: any = null;
export const getConfirmationResult = () => globalConfirmationResult;

export default function PhoneScreen() {
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [selectedCountry] = useState(COUNTRIES[0]);
  const [loading, setLoading] = useState(false);
  const [recaptchaReady, setRecaptchaReady] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

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

    initRecaptcha();
  }, []);

  const initRecaptcha = async () => {
    try {
      if (typeof document !== 'undefined') {
        let container = document.getElementById('recaptcha-container');

        if (!container) {
          container = document.createElement('div');
          container.id = 'recaptcha-container';
          document.body.appendChild(container);
        }

        recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible'
        });

        await recaptchaRef.current.render();
      }

      setRecaptchaReady(true);
    } catch (e) {
      console.log('Recaptcha error:', e);
      setRecaptchaReady(true);
    }
  };

  const handleContinue = async () => {
    const cleanPhone = phone.replace(/\D/g, '');

    if (cleanPhone.length < 10) {
      Alert.alert('Error', 'Invalid phone number');
      return;
    }

    if (!termsAccepted) {
      Alert.alert('Error', 'Accept terms to continue');
      return;
    }

    const fullPhone = `${selectedCountry.code}${cleanPhone}`;
    setLoading(true);

    try {
      const confirmation = await signInWithPhoneNumber(
        auth,
        fullPhone,
        recaptchaRef.current!
      );

      globalConfirmationResult = confirmation;

      router.push({
        pathname: '/(auth)/verify',
        params: { phone: fullPhone }
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.background.primary, COLORS.background.secondary]}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView style={styles.content}>
        <Text style={styles.title}>Enter phone number</Text>
        <TextInput
          style={styles.input}
          placeholder="Phone number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <TouchableOpacity onPress={() => setTermsAccepted(!termsAccepted)}>
          <Text style={styles.terms}>Accept Terms</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={handleContinue}
          disabled={!recaptchaReady || loading}
        >
          {loading ? <ActivityIndicator /> : <Text>Continue</Text>}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, marginBottom: 20 },
  input: { borderWidth: 1, padding: 12, marginBottom: 20 },
  button: { backgroundColor: 'gold', padding: 15, alignItems: 'center' },
  terms: { marginBottom: 20 }
});
'@

Set-Content -Path "app\(auth)\phone.tsx" -Value $content -Encoding UTF8
