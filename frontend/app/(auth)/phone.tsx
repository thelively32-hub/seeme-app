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
Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../../src/theme/colors';

// Firebase (WEB SDK only)
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

// Firebase config (web)
const firebaseConfig = {
apiKey: "AIzaSyDmH6FKtn9loWwyqz0zOiKrssdCXfz7Ceo",
authDomain: "see-me-app-5e487.firebaseapp.com",
projectId: "see-me-app-5e487",
storageBucket: "see-me-app-5e487.firebasestorage.app",
messagingSenderId: "5904630206",
appId: "1:5904630206:web:feecd66c5bcb713586f9ef",
};

// Init once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

// Countries
const COUNTRIES = [
{ code: '+1', flag: '🇺🇸', name: 'USA' },
{ code: '+34', flag: '🇪🇸', name: 'Spain' },
{ code: '+44', flag: '🇬🇧', name: 'UK' },
{ code: '+52', flag: '🇲🇽', name: 'Mexico' },
{ code: '+57', flag: '🇨🇴', name: 'Colombia' },
{ code: '+54', flag: '🇦🇷', name: 'Argentina' },
];

// Global confirmation for verify screen
let globalConfirmationResult: any = null;
export const getConfirmationResult = () => globalConfirmationResult;

export default function PhoneScreen() {
const insets = useSafeAreaInsets();

const [phone, setPhone] = useState('');
const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
const [showCountryPicker, setShowCountryPicker] = useState(false);
const [loading, setLoading] = useState(false);
const [recaptchaReady, setRecaptchaReady] = useState(false);
const [termsAccepted, setTermsAccepted] = useState(false);

const fadeAnim = useRef(new Animated.Value(0)).current;
const slideAnim = useRef(new Animated.Value(20)).current;
const recaptchaRef = useRef<any>(null);

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

```
initRecaptcha();

return () => {
  try {
    recaptchaRef.current?.clear?.();
  } catch {}
};
```

}, []);

const initRecaptcha = async () => {
try {
// Solo web tiene document; en iOS/Android EAS igual compila esto sin ejecutarlo en runtime web
if (typeof document !== 'undefined') {
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

```
    recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
    });

    await recaptchaRef.current.render();
  }

  setRecaptchaReady(true);
} catch (e) {
  console.log('Recaptcha init error:', e);
  setRecaptchaReady(true);
}
```

};

const formatPhone = (text: string) => {
const cleaned = text.replace(/\D/g, '');
if (cleaned.length <= 3) return cleaned;
if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
};

const handleContinue = async () => {
const cleanPhone = phone.replace(/\D/g, '');

```
if (cleanPhone.length < 10) {
  Alert.alert('Error', 'Enter a valid phone number');
  return;
}

if (!termsAccepted) {
  Alert.alert('Error', 'Accept terms to continue');
  return;
}

const fullPhone = `${selectedCountry.code}${cleanPhone}`;
setLoading(true);

try {
  if (!recaptchaRef.current) {
    throw new Error('reCAPTCHA not ready');
  }

  const confirmation = await signInWithPhoneNumber(
    auth,
    fullPhone,
    recaptchaRef.current
  );

  globalConfirmationResult = confirmation;

  router.push({
    pathname: '/(auth)/verify',
    params: { phone: fullPhone },
  });

} catch (error: any) {
  console.log(error);
  Alert.alert('Error', error?.message || 'Failed to send code');
} finally {
  setLoading(false);
}
```

};

const canContinue =
phone.replace(/\D/g, '').length >= 10 &&
termsAccepted &&
recaptchaReady &&
!loading;

return ( <View style={styles.container}>
<LinearGradient
colors={[COLORS.background.primary, COLORS.background.secondary]}
style={StyleSheet.absoluteFill}
/>

```
  <KeyboardAvoidingView
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    style={styles.keyboardView}
  >
    <Animated.View
      style={[
        styles.content,
        {
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 20,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={28} color={COLORS.text.primary} />
      </TouchableOpacity>

      <View style={styles.titleSection}>
        <Text style={styles.title}>What's your phone number?</Text>
        <Text style={styles.subtitle}>
          We'll send you a verification code
        </Text>
      </View>

      <View style={styles.inputSection}>
        <TouchableOpacity
          style={styles.countrySelector}
          onPress={() => setShowCountryPicker(!showCountryPicker)}
        >
          <Text>{selectedCountry.flag}</Text>
          <Text>{selectedCountry.code}</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={(t) => setPhone(formatPhone(t))}
          keyboardType="phone-pad"
          placeholder="Phone number"
        />
      </View>

      <TouchableOpacity onPress={() => setTermsAccepted(!termsAccepted)}>
        <Text style={styles.terms}>Accept Terms</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={handleContinue}
        disabled={!canContinue}
      >
        {loading ? <ActivityIndicator /> : <Text>Continue</Text>}
      </TouchableOpacity>
    </Animated.View>
  </KeyboardAvoidingView>
</View>
```

);
}

const styles = StyleSheet.create({
container: { flex: 1 },
keyboardView: { flex: 1 },
content: { flex: 1, padding: 20 },
titleSection: { marginBottom: 20 },
title: { fontSize: 26, fontWeight: '700', color: '#fff' },
subtitle: { color: '#aaa' },
inputSection: { flexDirection: 'row', gap: 10 },
countrySelector: { padding: 10, backgroundColor: '#222', borderRadius: 10 },
input: { flex: 1, backgroundColor: '#222', padding: 12, borderRadius: 10 },
button: { marginTop: 20, padding: 15, backgroundColor: 'gold', alignItems: 'center' },
terms: { marginTop: 20, color: '#aaa' },
backButton: { marginBottom: 20 },
});
