import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../../src/theme/colors';

// Country codes data
const COUNTRIES = [
  { code: '+1', flag: '🇺🇸', name: 'USA' },
  { code: '+34', flag: '🇪🇸', name: 'Spain' },
  { code: '+44', flag: '🇬🇧', name: 'UK' },
  { code: '+52', flag: '🇲🇽', name: 'Mexico' },
  { code: '+57', flag: '🇨🇴', name: 'Colombia' },
  { code: '+54', flag: '🇦🇷', name: 'Argentina' },
];

export default function PhoneScreen() {
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
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
  }, []);

  const formatPhone = (text: string) => {
    // Remove non-digits
    const cleaned = text.replace(/\D/g, '');
    // Format as (XXX) XXX-XXXX
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  };

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhone(text);
    setPhone(formatted);
  };

  const handleContinue = () => {
    if (phone.replace(/\D/g, '').length >= 10) {
      router.push({
        pathname: '/(auth)/verify',
        params: { phone: `${selectedCountry.code}${phone.replace(/\D/g, '')}` }
      });
    }
  };

  const isValidPhone = phone.replace(/\D/g, '').length >= 10;

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
              paddingTop: insets.top + 20,
              paddingBottom: insets.bottom + 20,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={COLORS.text.primary} />
          </TouchableOpacity>

          {/* Title Section */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>What's your{"\n"}phone number?</Text>
            <Text style={styles.subtitle}>
              We'll send you a verification code to confirm it's you
            </Text>
          </View>

          {/* Phone Input Section */}
          <View style={styles.inputSection}>
            {/* Country Selector */}
            <TouchableOpacity
              style={styles.countrySelector}
              onPress={() => setShowCountryPicker(!showCountryPicker)}
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
              />
              {phone.length > 0 && (
                <TouchableOpacity onPress={() => setPhone('')}>
                  <View style={styles.clearButton}>
                    <Ionicons name="close" size={16} color={COLORS.text.tertiary} />
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Country Picker Dropdown */}
          {showCountryPicker && (
            <View style={styles.countryPicker}>
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
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Spacer */}
          <View style={styles.spacer} />

          {/* Continue Button */}
          <TouchableOpacity
            style={[styles.continueButton, !isValidPhone && styles.continueButtonDisabled]}
            onPress={handleContinue}
            disabled={!isValidPhone}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={isValidPhone ? COLORS.gradients.goldButton : ['#3A3A3A', '#2A2A2A']}
              style={styles.continueButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={[
                styles.continueButtonText,
                !isValidPhone && styles.continueButtonTextDisabled
              ]}>
                Continue
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Terms */}
          <Text style={styles.termsText}>
            By tapping Continue, you agree to our{' '}
            <Text style={styles.termsLink}>Terms</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
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
  countryPicker: {
    marginTop: 12,
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
  },
  countryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  countryOptionSelected: {
    backgroundColor: COLORS.background.cardHover,
  },
  countryOptionFlag: {
    fontSize: 20,
  },
  countryOptionName: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text.primary,
  },
  countryOptionCode: {
    fontSize: 14,
    color: COLORS.text.tertiary,
  },
  spacer: {
    flex: 1,
  },
  continueButton: {
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 16,
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
    color: COLORS.text.dark,
    letterSpacing: 0.5,
  },
  continueButtonTextDisabled: {
    color: COLORS.text.muted,
  },
  termsText: {
    fontSize: 13,
    color: COLORS.text.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  termsLink: {
    color: COLORS.gold.primary,
  },
});
