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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../../src/theme/colors';

const CODE_LENGTH = 6;

export default function VerifyScreen() {
  const insets = useSafeAreaInsets();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);
  
  const inputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

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

    // Countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleCodeChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(cleaned);
    setError('');

    // Auto-submit when code is complete
    if (cleaned.length === CODE_LENGTH) {
      verifyCode(cleaned);
    }
  };

  const verifyCode = async (verificationCode: string) => {
    setLoading(true);
    setError('');

    try {
      // Simulate API call - In production, verify with backend
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // For demo: any 6-digit code works
      // In production: validate with Twilio/Firebase
      if (verificationCode.length === CODE_LENGTH) {
        router.replace('/(auth)/create-profile');
      } else {
        throw new Error('Invalid code');
      }
    } catch (e) {
      setError('Invalid verification code');
      shake();
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    
    setCanResend(false);
    setCountdown(30);
    setError('');
    
    // Restart countdown
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Simulate sending new code
    // In production: call API to resend SMS
  };

  const renderCodeBoxes = () => {
    const boxes = [];
    for (let i = 0; i < CODE_LENGTH; i++) {
      const isFilled = code.length > i;
      const isActive = code.length === i;
      
      boxes.push(
        <View
          key={i}
          style={[
            styles.codeBox,
            isFilled && styles.codeBoxFilled,
            isActive && styles.codeBoxActive,
            error && styles.codeBoxError,
          ]}
        >
          <Text style={styles.codeText}>
            {code[i] || ''}
          </Text>
          {isActive && <View style={styles.cursor} />}
        </View>
      );
    }
    return boxes;
  };

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
            <Text style={styles.title}>Enter the code</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit code to{"\n"}
              <Text style={styles.phoneText}>{phone}</Text>
            </Text>
          </View>

          {/* Code Input */}
          <Animated.View style={[styles.codeContainer, { transform: [{ translateX: shakeAnim }] }]}>
            <TouchableOpacity
              style={styles.codeInputWrapper}
              activeOpacity={1}
              onPress={() => inputRef.current?.focus()}
            >
              {renderCodeBoxes()}
            </TouchableOpacity>
            
            <TextInput
              ref={inputRef}
              style={styles.hiddenInput}
              value={code}
              onChangeText={handleCodeChange}
              keyboardType="number-pad"
              maxLength={CODE_LENGTH}
              autoFocus
            />
          </Animated.View>

          {/* Error Message */}
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={18} color={COLORS.accent.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Loading Indicator */}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.gold.primary} />
              <Text style={styles.loadingText}>Verifying...</Text>
            </View>
          )}

          {/* Spacer */}
          <View style={styles.spacer} />

          {/* Resend Section */}
          <View style={styles.resendSection}>
            <Text style={styles.resendText}>Didn't receive the code?</Text>
            {canResend ? (
              <TouchableOpacity onPress={handleResend}>
                <Text style={styles.resendLink}>Resend Code</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.countdownText}>Resend in {countdown}s</Text>
            )}
          </View>

          {/* Change Number */}
          <TouchableOpacity style={styles.changeNumber} onPress={() => router.back()}>
            <Text style={styles.changeNumberText}>Change phone number</Text>
          </TouchableOpacity>
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
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.text.secondary,
    marginTop: 12,
    lineHeight: 24,
  },
  phoneText: {
    color: COLORS.gold.primary,
    fontWeight: '600',
  },
  codeContainer: {
    alignItems: 'center',
  },
  codeInputWrapper: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  codeBox: {
    width: 48,
    height: 56,
    borderRadius: 12,
    backgroundColor: COLORS.background.card,
    borderWidth: 1.5,
    borderColor: COLORS.border.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBoxFilled: {
    borderColor: COLORS.gold.primary,
    backgroundColor: 'rgba(244, 197, 66, 0.1)',
  },
  codeBoxActive: {
    borderColor: COLORS.gold.bright,
    borderWidth: 2,
  },
  codeBoxError: {
    borderColor: COLORS.accent.error,
  },
  codeText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  cursor: {
    position: 'absolute',
    bottom: 12,
    width: 2,
    height: 24,
    backgroundColor: COLORS.gold.primary,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 0,
    width: 0,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
  },
  errorText: {
    color: COLORS.accent.error,
    fontSize: 14,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
  },
  loadingText: {
    color: COLORS.gold.primary,
    fontSize: 14,
  },
  spacer: {
    flex: 1,
  },
  resendSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  resendText: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    marginBottom: 8,
  },
  resendLink: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gold.primary,
  },
  countdownText: {
    fontSize: 16,
    color: COLORS.text.muted,
  },
  changeNumber: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  changeNumberText: {
    fontSize: 15,
    color: COLORS.text.secondary,
    textDecorationLine: 'underline',
  },
});
