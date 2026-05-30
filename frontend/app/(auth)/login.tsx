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
  iosClientId: '5904630206-q9jhf2if199pmv836kuvkc66mv39if97.apps.googleusercontent.com',
  androidClientId: '5904630206-f3m6liorm4i12b5bla4fo3ss4l9m3tsq.apps.googleusercontent.com',
  webClientId: '5904630206-j1611vsnkc3psffesuoqovjjkud58no0.apps.googleusercontent.com',
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
        <Text style={styles.title}>Welcome to Vibe Me</Text>
        <Text style={styles.subtitle}>Choose how you want to continue</Text>
      </View>

      {/* Auth Options */}
      <View style={styles.optionsList}>
        {/* Google - Professional Style */}
        <TouchableOpacity 
          style={styles.socialButton}
          onPress={handleGoogleSignIn}
          disabled={!request || socialLoading !== null}
          activeOpacity={0.8}
        >
          {socialLoading === 'google' ? (
            <ActivityIndicator size="small" color="#4285F4" />
          ) : (
            <>
              <View style={styles.googleIconContainer}>
                <Text style={styles.googleG}>G</Text>
              </View>
              <Text style={styles.socialButtonText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Apple - Show on all platforms with appropriate styling */}
        {(Platform.OS === 'ios' && appleAuthAvailable) ? (
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
                <Ionicons name="logo-apple" size={22} color="#fff" />
                <Text style={styles.appleButtonText}>Continue with Apple</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.appleButton}
            onPress={() => Alert.alert('Apple Sign-In', 'Apple Sign-In is only available on iOS devices')}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-apple" size={22} color="#fff" />
            <Text style={styles.appleButtonText}>Continue with Apple</Text>
          </TouchableOpacity>
        )}

        {/* Phone */}
        <TouchableOpacity 
          style={styles.phoneButton}
          onPress={handlePhoneSignIn}
          disabled={socialLoading !== null}
          activeOpacity={0.8}
        >
          <View style={styles.phoneIconContainer}>
            <Ionicons name="call" size={20} color="#1A1A1A" />
          </View>
          <Text style={styles.phoneButtonText}>Continue with Phone</Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Email Login */}
        <TouchableOpacity 
          style={styles.emailButton}
          onPress={() => { resetForm(); setMode('email-login'); }}
          disabled={socialLoading !== null}
          activeOpacity={0.8}
        >
          <Ionicons name="mail-outline" size={22} color={COLORS.text.primary} />
          <Text style={styles.emailButtonText}>Sign in with Email</Text>
        </TouchableOpacity>

        {/* Create Account - Gold gradient */}
        <TouchableOpacity 
          style={styles.createAccountButton}
          onPress={() => { resetForm(); setMode('email-signup'); }}
          disabled={socialLoading !== null}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#FFD700', '#FFC000', '#FFB300']}
            style={styles.createAccountGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="person-add-outline" size={20} color="#1A1A1A" />
            <Text style={styles.createAccountText}>Create New Account</Text>
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
      <Text style={styles.formSubtitle}>Join Vibe Me and discover your social scene</Text>

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
  
  // Google Button - White with colored G
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      },
    }),
  },
  googleIconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleG: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4285F4',
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  
  // Apple Button - Black
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 10,
  },
  appleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Phone Button - Gold/Yellow
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
  },
  phoneIconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  
  // Divider
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
  
  // Email Button - Outline style
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border.light,
  },
  emailButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  
  // Create Account Button - Gold gradient
  createAccountButton: {
    borderRadius: 28,
    overflow: 'hidden',
    marginTop: 4,
  },
  createAccountGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 10,
  },
  createAccountText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  
  // Terms
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
