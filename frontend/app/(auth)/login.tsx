import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';

import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/services/api';
import COLORS from '../../src/theme/colors';

WebBrowser.maybeCompleteAuthSession();

type AuthMode = 'options' | 'email-login' | 'email-signup';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, register, isAuthenticated } = useAuth();

  const [mode, setMode] = useState<AuthMode>('options');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Google Auth
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: '5904630206-YOUR_EXPO_CLIENT_ID.apps.googleusercontent.com',
    iosClientId: '5904630206-YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
    androidClientId: '5904630206-YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com',
    webClientId: '5904630206-6m5oeud9l96i10a69lfjkl3l2r77q1md.apps.googleusercontent.com',
  });

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    checkAppleAuthAvailability();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)/explore');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (response?.type === 'success') {
      handleGoogleResponse(response);
    }
  }, [response]);

  const checkAppleAuthAvailability = async () => {
    if (Platform.OS === 'ios') {
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      setAppleAuthAvailable(isAvailable);
    }
  };

  const handleGoogleSignIn = async () => {
    setSocialLoading('google');
    try {
      await promptAsync();
    } catch (error) {
      console.error('Google Sign-In error:', error);
      Alert.alert('Error', 'Google Sign-In failed');
    } finally {
      setSocialLoading(null);
    }
  };

  const handleGoogleResponse = async (response: any) => {
    if (response?.authentication?.accessToken) {
      setSocialLoading('google');
      try {
        const userInfoResponse = await fetch(
          'https://www.googleapis.com/userinfo/v2/me',
          { headers: { Authorization: `Bearer ${response.authentication.accessToken}` } }
        );
        const userInfo = await userInfoResponse.json();
        
        await api.socialAuth('google', {
          email: userInfo.email,
          name: userInfo.name,
          google_id: userInfo.id,
          avatar: userInfo.picture,
        });
        router.replace('/(tabs)/explore');
      } catch (error) {
        console.error('Google auth error:', error);
        Alert.alert('Error', 'Failed to authenticate with Google');
      } finally {
        setSocialLoading(null);
      }
    }
  };

  const handleAppleSignIn = async () => {
    if (!appleAuthAvailable) {
      Alert.alert('Not Available', 'Apple Sign-In is only available on iOS devices');
      return;
    }
    
    setSocialLoading('apple');
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      
      await api.socialAuth('apple', {
        apple_id: credential.user,
        email: credential.email || undefined,
        name: credential.fullName?.givenName 
          ? `${credential.fullName.givenName} ${credential.fullName.familyName || ''}`.trim()
          : undefined,
        identity_token: credential.identityToken || undefined,
      });
      router.replace('/(tabs)/explore');
    } catch (error: any) {
      if (error.code !== 'ERR_CANCELED') {
        Alert.alert('Error', 'Apple Sign-In failed');
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const handlePhoneSignIn = () => {
    router.push('/(auth)/phone');
  };

  const handleEmailLogin = async () => {
    if (!email || !password) {
      setError('Please fill all fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      router.replace('/(tabs)/explore');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignup = async () => {
    if (!name || !email || !password) {
      setError('Please fill all fields');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await register(name, email, password);
      router.replace('/(tabs)/explore');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setError('');
  };

  // Main options screen
  const renderOptions = () => (
    <Animated.View style={[styles.optionsContainer, { opacity: fadeAnim }]}>
      {/* Header */}
      <View style={styles.header}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoPinContainer}>
            <LinearGradient
              colors={COLORS.gradients.goldButton}
              style={styles.logoPin}
            >
              <Ionicons name="eye" size={24} color={COLORS.background.primary} />
            </LinearGradient>
          </View>
          <View style={styles.logoTextWrapper}>
            <Text style={styles.logoVibe}>Vibe</Text>
            <Text style={styles.logoMe}>ME</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>Únete a la vibra</Text>
      </View>

      {/* Auth Buttons */}
      <View style={styles.authButtons}>
        {/* Google */}
        <TouchableOpacity
          style={styles.socialButton}
          onPress={handleGoogleSignIn}
          disabled={!request || socialLoading !== null}
          activeOpacity={0.8}
        >
          {socialLoading === 'google' ? (
            <ActivityIndicator size="small" color={COLORS.text.primary} />
          ) : (
            <>
              <View style={styles.googleIcon}>
                <Text style={styles.googleG}>G</Text>
              </View>
              <Text style={styles.socialButtonText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Apple */}
        <TouchableOpacity
          style={styles.appleButton}
          onPress={handleAppleSignIn}
          disabled={socialLoading !== null}
          activeOpacity={0.8}
        >
          {socialLoading === 'apple' ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="logo-apple" size={20} color="#fff" />
              <Text style={styles.appleButtonText}>Continue with Apple</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Phone */}
        <TouchableOpacity
          style={styles.phoneButton}
          onPress={handlePhoneSignIn}
          disabled={socialLoading !== null}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={COLORS.gradients.goldButton}
            style={styles.phoneButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="call" size={18} color={COLORS.background.primary} />
            <Text style={styles.phoneButtonText}>Continue with phone</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Email */}
        <TouchableOpacity
          style={styles.emailButton}
          onPress={() => { resetForm(); setMode('email-login'); }}
          disabled={socialLoading !== null}
          activeOpacity={0.8}
        >
          <Ionicons name="mail-outline" size={18} color={COLORS.text.primary} />
          <Text style={styles.emailButtonText}>Continue with email</Text>
        </TouchableOpacity>
      </View>

      {/* Terms */}
      <Text style={styles.terms}>
        Al crear una cuenta, aceptas nuestros{'\n'}
        <Text style={styles.termsLink} onPress={() => router.push('/legal/terms')}>
          Términos de Servicio
        </Text>
        {' '}y{' '}
        <Text style={styles.termsLink} onPress={() => router.push('/legal/privacy')}>
          Política de Privacidad
        </Text>
      </Text>
    </Animated.View>
  );

  // Email form
  const renderEmailForm = () => (
    <View style={styles.formContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => setMode('options')}>
        <Ionicons name="chevron-back" size={28} color={COLORS.text.primary} />
      </TouchableOpacity>

      <Text style={styles.formTitle}>
        {mode === 'email-login' ? 'Welcome back' : 'Create account'}
      </Text>
      <Text style={styles.formSubtitle}>
        {mode === 'email-login' ? 'Sign in to continue' : 'Join the vibe'}
      </Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {mode === 'email-signup' && (
        <View style={styles.inputContainer}>
          <Ionicons name="person-outline" size={20} color={COLORS.text.muted} />
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor={COLORS.text.muted}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        </View>
      )}

      <View style={styles.inputContainer}>
        <Ionicons name="mail-outline" size={20} color={COLORS.text.muted} />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={COLORS.text.muted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputContainer}>
        <Ionicons name="lock-closed-outline" size={20} color={COLORS.text.muted} />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={COLORS.text.muted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={COLORS.text.muted}
          />
        </TouchableOpacity>
      </View>

      {mode === 'email-login' && (
        <TouchableOpacity style={styles.forgotPassword}>
          <Text style={styles.forgotPasswordText}>Forgot password?</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.submitButton}
        onPress={mode === 'email-login' ? handleEmailLogin : handleEmailSignup}
        disabled={loading}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={COLORS.gradients.goldButton}
          style={styles.submitButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.background.primary} />
          ) : (
            <Text style={styles.submitButtonText}>
              {mode === 'email-login' ? 'Sign In' : 'Create Account'}
            </Text>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <View style={styles.switchMode}>
        <Text style={styles.switchModeText}>
          {mode === 'email-login' ? "Don't have an account? " : 'Already have an account? '}
        </Text>
        <TouchableOpacity
          onPress={() => {
            resetForm();
            setMode(mode === 'email-login' ? 'email-signup' : 'email-login');
          }}
        >
          <Text style={styles.switchModeLink}>
            {mode === 'email-login' ? 'Sign up' : 'Sign in'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={COLORS.gradients.darkBackground}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {mode === 'options' ? renderOptions() : renderEmailForm()}
        </ScrollView>
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
    flexGrow: 1,
    paddingHorizontal: 24,
  },

  // Options Screen
  optionsContainer: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoPinContainer: {
    marginBottom: 12,
  },
  logoPin: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderBottomLeftRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '45deg' }],
    ...Platform.select({
      ios: {
        shadowColor: COLORS.gold.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
    }),
  },
  logoTextWrapper: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  logoVibe: {
    fontSize: 42,
    fontWeight: '200',
    color: COLORS.text.primary,
    fontStyle: 'italic',
    letterSpacing: -1,
    ...Platform.select({
      ios: { fontFamily: 'Georgia' },
    }),
  },
  logoMe: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.gold.primary,
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.text.secondary,
    marginTop: 8,
  },

  // Auth Buttons
  authButtons: {
    gap: 12,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.glass.background,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
    borderRadius: 28,
    paddingVertical: 14,
    gap: 10,
  },
  googleIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleG: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4285F4',
  },
  socialButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    borderRadius: 28,
    paddingVertical: 14,
    gap: 10,
  },
  appleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  phoneButton: {
    borderRadius: 28,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.gold.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
    }),
  },
  phoneButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  phoneButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.background.primary,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border.light,
  },
  dividerText: {
    color: COLORS.text.muted,
    paddingHorizontal: 16,
    fontSize: 13,
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border.light,
    borderRadius: 28,
    paddingVertical: 14,
    gap: 10,
  },
  emailButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  terms: {
    fontSize: 12,
    color: COLORS.text.muted,
    textAlign: 'center',
    marginTop: 32,
    lineHeight: 18,
  },
  termsLink: {
    color: COLORS.gold.primary,
    fontWeight: '600',
  },

  // Form
  formContainer: {
    flex: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    marginLeft: -8,
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 15,
    color: COLORS.text.secondary,
    marginBottom: 32,
  },
  errorText: {
    color: COLORS.accent.error,
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    padding: 12,
    borderRadius: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.glass.background,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  input: {
    flex: 1,
    height: 52,
    color: COLORS.text.primary,
    fontSize: 15,
    marginLeft: 12,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: COLORS.gold.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  submitButton: {
    borderRadius: 28,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.gold.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
    }),
  },
  submitButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.background.primary,
  },
  switchMode: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  switchModeText: {
    color: COLORS.text.secondary,
    fontSize: 14,
  },
  switchModeLink: {
    color: COLORS.gold.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
