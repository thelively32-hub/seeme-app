import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/services/api';
import COLORS from '../../src/theme/colors';

const { width } = Dimensions.get('window');

// Complete auth session for web
WebBrowser.maybeCompleteAuthSession();

// Google OAuth Client IDs - From Firebase Console
const GOOGLE_CONFIG = {
  androidClientId: '5904630206-android.apps.googleusercontent.com',
  iosClientId: '5904630206-ios.apps.googleusercontent.com', 
  webClientId: '5904630206-web.apps.googleusercontent.com',
  expoClientId: '5904630206-expo.apps.googleusercontent.com',
};

type AuthMode = 'options' | 'email-login' | 'email-signup';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, register, refreshUser } = useAuth();
  const [mode, setMode] = useState<AuthMode>('options');
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);
  
  // Email form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Google Auth
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: GOOGLE_CONFIG.androidClientId,
    iosClientId: GOOGLE_CONFIG.iosClientId,
    webClientId: GOOGLE_CONFIG.webClientId,
  });

  // Check Apple Auth availability
  useEffect(() => {
    const checkAppleAuth = async () => {
      const available = await AppleAuthentication.isAvailableAsync();
      setAppleAuthAvailable(available);
    };
    checkAppleAuth();
  }, []);

  // Handle Google response
  useEffect(() => {
    if (response?.type === 'success') {
      handleGoogleSuccess(response.authentication?.accessToken);
    } else if (response?.type === 'error') {
      setSocialLoading(null);
      Alert.alert('Error', 'Google sign in failed. Please try again.');
    }
  }, [response]);

  const handleGoogleSuccess = async (accessToken: string | undefined) => {
    if (!accessToken) {
      setSocialLoading(null);
      return;
    }
    
    try {
      // Get user info from Google
      const userInfoResponse = await fetch(
        'https://www.googleapis.com/userinfo/v2/me',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const userInfo = await userInfoResponse.json();
      
      // Authenticate with our backend
      const result = await api.socialAuth('google', {
        email: userInfo.email,
        name: userInfo.name,
        google_id: userInfo.id,
        avatar: userInfo.picture,
      });
      
      await refreshUser();
      
      if (result.is_new_user) {
        router.replace('/(auth)/create-profile');
      } else {
        router.replace('/(tabs)/explore');
      }
    } catch (e: any) {
      console.error('Google auth error:', e);
      Alert.alert('Error', e.message || 'Failed to sign in with Google');
    } finally {
      setSocialLoading(null);
    }
  };

  const handleGoogleSignIn = async () => {
    setSocialLoading('google');
    try {
      await promptAsync();
    } catch (e) {
      setSocialLoading(null);
      Alert.alert('Error', 'Failed to start Google sign in');
    }
  };

  const handleAppleSignIn = async () => {
    setSocialLoading('apple');
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      
      // Get name from credential (only available on first sign in)
      const fullName = credential.fullName;
      const displayName = fullName 
        ? `${fullName.givenName || ''} ${fullName.familyName || ''}`.trim()
        : undefined;
      
      // Authenticate with our backend
      const result = await api.socialAuth('apple', {
        apple_id: credential.user,
        email: credential.email,
        name: displayName,
        identity_token: credential.identityToken,
      });
      
      await refreshUser();
      
      if (result.is_new_user) {
        router.replace('/(auth)/create-profile');
      } else {
        router.replace('/(tabs)/explore');
      }
    } catch (e: any) {
      if (e.code !== 'ERR_CANCELED') {
        console.error('Apple auth error:', e);
        Alert.alert('Error', e.message || 'Failed to sign in with Apple');
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
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      router.replace('/(tabs)/explore');
    } catch (e: any) {
      setError(e.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignup = async () => {
    if (!name || !email || !password) {
      setError('Please fill in all fields');
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
      router.replace('/(auth)/create-profile');
    } catch (e: any) {
      setError(e.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setError('');
  };

  // Main options screen
  const renderOptions = () => (
    <View style={styles.optionsContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <LinearGradient
            colors={[COLORS.gold.bright, COLORS.gold.primary]}
            style={styles.logoIcon}
          >
            <Ionicons name="location" size={32} color={COLORS.text.dark} />
          </LinearGradient>
        </View>
        <Text style={styles.title}>Welcome to SEE ME</Text>
        <Text style={styles.subtitle}>Choose how you want to continue</Text>
      </View>

      {/* Auth Options */}
      <View style={styles.optionsList}>
        {/* Google */}
        <TouchableOpacity 
          style={styles.optionButton}
          onPress={handleGoogleSignIn}
          disabled={!request || socialLoading !== null}
          activeOpacity={0.8}
        >
          <View style={[styles.optionIconContainer, { backgroundColor: '#fff' }]}>
            {socialLoading === 'google' ? (
              <ActivityIndicator size="small" color="#4285F4" />
            ) : (
              <Ionicons name="logo-google" size={24} color="#4285F4" />
            )}
          </View>
          <Text style={styles.optionText}>Continue with Google</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.text.tertiary} />
        </TouchableOpacity>

        {/* Apple - Only show on iOS */}
        {(Platform.OS === 'ios' && appleAuthAvailable) && (
          <TouchableOpacity 
            style={styles.optionButton}
            onPress={handleAppleSignIn}
            disabled={socialLoading !== null}
            activeOpacity={0.8}
          >
            <View style={[styles.optionIconContainer, { backgroundColor: '#fff' }]}>
              {socialLoading === 'apple' ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Ionicons name="logo-apple" size={24} color="#000" />
              )}
            </View>
            <Text style={styles.optionText}>Continue with Apple</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.text.tertiary} />
          </TouchableOpacity>
        )}

        {/* Phone */}
        <TouchableOpacity 
          style={styles.optionButton}
          onPress={handlePhoneSignIn}
          disabled={socialLoading !== null}
          activeOpacity={0.8}
        >
          <View style={[styles.optionIconContainer, { backgroundColor: COLORS.gold.primary }]}>
            <Ionicons name="call" size={24} color={COLORS.text.dark} />
          </View>
          <Text style={styles.optionText}>Continue with Phone</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.text.tertiary} />
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Email Login */}
        <TouchableOpacity 
          style={styles.optionButton}
          onPress={() => { resetForm(); setMode('email-login'); }}
          disabled={socialLoading !== null}
          activeOpacity={0.8}
        >
          <View style={[styles.optionIconContainer, { backgroundColor: COLORS.background.cardHover }]}>
            <Ionicons name="mail" size={24} color={COLORS.gold.primary} />
          </View>
          <Text style={styles.optionText}>Sign in with Email</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.text.tertiary} />
        </TouchableOpacity>

        {/* Email Signup */}
        <TouchableOpacity 
          style={[styles.optionButton, styles.signupButton]}
          onPress={() => { resetForm(); setMode('email-signup'); }}
          disabled={socialLoading !== null}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={COLORS.gradients.goldButton}
            style={styles.signupGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="person-add" size={20} color={COLORS.text.dark} />
            <Text style={styles.signupButtonText}>Create New Account</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Terms */}
      <Text style={styles.termsText}>
        By continuing, you agree to our{' '}
        <Text style={styles.termsLink} onPress={() => router.push('/legal/terms')}>Terms of Service</Text>
        {' '}and{' '}
        <Text style={styles.termsLink} onPress={() => router.push('/legal/privacy')}>Privacy Policy</Text>
      </Text>
    </View>
  );

  // Email Login Form
  const renderEmailLogin = () => (
    <View style={styles.formContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => setMode('options')}>
        <Ionicons name="chevron-back" size={28} color={COLORS.text.primary} />
      </TouchableOpacity>

      <Text style={styles.formTitle}>Sign In</Text>
      <Text style={styles.formSubtitle}>Welcome back! Enter your credentials</Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

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
          autoCorrect={false}
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
            name={showPassword ? 'eye-outline' : 'eye-off-outline'}
            size={20}
            color={COLORS.text.muted}
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.forgotPassword}>
        <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.submitButtonWrapper}
        onPress={handleEmailLogin}
        disabled={loading}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={COLORS.gradients.goldButton}
          style={styles.submitButton}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.text.dark} />
          ) : (
            <Text style={styles.submitButtonText}>Sign In</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <View style={styles.switchMode}>
        <Text style={styles.switchModeText}>Don't have an account? </Text>
        <TouchableOpacity onPress={() => { resetForm(); setMode('email-signup'); }}>
          <Text style={styles.switchModeLink}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Email Signup Form
  const renderEmailSignup = () => (
    <View style={styles.formContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => setMode('options')}>
        <Ionicons name="chevron-back" size={28} color={COLORS.text.primary} />
      </TouchableOpacity>

      <Text style={styles.formTitle}>Create Account</Text>
      <Text style={styles.formSubtitle}>Join SEE ME and discover your social scene</Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.inputContainer}>
        <Ionicons name="person-outline" size={20} color={COLORS.text.muted} />
        <TextInput
          style={styles.input}
          placeholder="Your Name"
          placeholderTextColor={COLORS.text.muted}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
      </View>

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
          autoCorrect={false}
        />
      </View>

      <View style={styles.inputContainer}>
        <Ionicons name="lock-closed-outline" size={20} color={COLORS.text.muted} />
        <TextInput
          style={styles.input}
          placeholder="Password (min 6 characters)"
          placeholderTextColor={COLORS.text.muted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Ionicons
            name={showPassword ? 'eye-outline' : 'eye-off-outline'}
            size={20}
            color={COLORS.text.muted}
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.submitButtonWrapper}
        onPress={handleEmailSignup}
        disabled={loading}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={COLORS.gradients.goldButton}
          style={styles.submitButton}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.text.dark} />
          ) : (
            <Text style={styles.submitButtonText}>Create Account</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <View style={styles.switchMode}>
        <Text style={styles.switchModeText}>Already have an account? </Text>
        <TouchableOpacity onPress={() => { resetForm(); setMode('email-login'); }}>
          <Text style={styles.switchModeLink}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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
          {mode === 'options' && renderOptions()}
          {mode === 'email-login' && renderEmailLogin()}
          {mode === 'email-signup' && renderEmailSignup()}
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
    marginBottom: 40,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  optionsList: {
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  optionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
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
    fontSize: 14,
  },
  signupButton: {
    padding: 0,
    borderWidth: 0,
    overflow: 'hidden',
  },
  signupGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    gap: 10,
  },
  signupButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.dark,
  },
  termsText: {
    fontSize: 13,
    color: COLORS.text.muted,
    textAlign: 'center',
    marginTop: 32,
    lineHeight: 20,
  },
  termsLink: {
    color: COLORS.gold.primary,
    fontWeight: '600',
  },

  // Form Screens
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
    fontSize: 16,
    color: COLORS.text.secondary,
    marginBottom: 32,
  },
  errorText: {
    color: COLORS.accent.error,
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    backgroundColor: 'rgba(255, 77, 79, 0.1)',
    padding: 12,
    borderRadius: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  input: {
    flex: 1,
    height: 56,
    color: COLORS.text.primary,
    fontSize: 16,
    marginLeft: 12,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: COLORS.gold.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  submitButtonWrapper: {
    borderRadius: 30,
    overflow: 'hidden',
    marginTop: 8,
  },
  submitButton: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text.dark,
  },
  switchMode: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  switchModeText: {
    color: COLORS.text.secondary,
    fontSize: 15,
  },
  switchModeLink: {
    color: COLORS.gold.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});
