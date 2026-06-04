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
import Svg, { Path, Circle, G, Defs, ClipPath, Rect } from 'react-native-svg';

import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/services/api';
import COLORS from '../../src/theme/colors';

WebBrowser.maybeCompleteAuthSession();

// Official Google "G" Logo Component
const GoogleLogo = ({ size = 20 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <Path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <Path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <Path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </Svg>
);

// Vibe Me Pin Logo Component
const VibeMePinLogo = ({ size = 80 }: { size?: number }) => (
  <View style={[pinLogoStyles.container, { width: size, height: size * 1.25 }]}>
    <LinearGradient
      colors={['#FFD700', '#F5B800', '#D4A000']}
      style={[pinLogoStyles.pinBody, { width: size, height: size }]}
    >
      {/* Inner circle with eye */}
      <View style={[pinLogoStyles.innerCircle, { width: size * 0.6, height: size * 0.6, borderRadius: size * 0.3 }]}>
        <View style={[pinLogoStyles.eyeOuter, { width: size * 0.45, height: size * 0.3, borderRadius: size * 0.15 }]}>
          <View style={[pinLogoStyles.eyePupil, { width: size * 0.18, height: size * 0.18, borderRadius: size * 0.09 }]}>
            <View style={[pinLogoStyles.eyeHighlight, { width: size * 0.06, height: size * 0.06, borderRadius: size * 0.03 }]} />
          </View>
        </View>
      </View>
    </LinearGradient>
    {/* Pin pointer */}
    <View style={[pinLogoStyles.pinPointer, { 
      borderLeftWidth: size * 0.2, 
      borderRightWidth: size * 0.2, 
      borderTopWidth: size * 0.25,
      marginTop: -size * 0.1,
    }]} />
  </View>
);

const pinLogoStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  pinBody: {
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  innerCircle: {
    backgroundColor: '#1A1500',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeOuter: {
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyePupil: {
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 3,
  },
  eyeHighlight: {
    backgroundColor: '#FFD700',
  },
  pinPointer: {
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#D4A000',
    borderStyle: 'solid',
  },
});

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
    iosClientId: '5904630206-dg5klianoqk3b89brb0h4vf91aqslrnh.apps.googleusercontent.com',
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
      
      console.log('Apple credential received:', credential.user);
      
      const result = await api.socialAuth('apple', {
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
      {/* Header - Solo texto, sin pin */}
      <View style={styles.header}>
        <View style={styles.logoTextWrapper}>
          <Text style={styles.logoVibe}>Vibe</Text>
          <View style={styles.logoMeRow}>
            <Text style={styles.logoMe}>M E</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>Únete a la vibra</Text>
      </View>

      {/* Auth Buttons */}
      <View style={styles.authButtons}>
        {/* Google - white rounded button */}
        <TouchableOpacity
          style={styles.socialButton}
          onPress={handleGoogleSignIn}
          disabled={!request || socialLoading !== null}
          activeOpacity={0.8}
        >
          {socialLoading === 'google' ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <>
              <GoogleLogo size={20} />
              <Text style={styles.socialButtonText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Apple - white rounded button */}
        <TouchableOpacity
          style={styles.socialButton}
          onPress={handleAppleSignIn}
          disabled={socialLoading !== null}
          activeOpacity={0.8}
        >
          {socialLoading === 'apple' ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <>
              <Ionicons name="logo-apple" size={20} color="#000" />
              <Text style={styles.socialButtonText}>Continue with Apple</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Phone - purple outline button */}
        <TouchableOpacity
          style={styles.phoneButton}
          onPress={handlePhoneSignIn}
          disabled={socialLoading !== null}
          activeOpacity={0.9}
        >
          <Ionicons name="call" size={18} color="#9B59B6" />
          <Text style={styles.phoneButtonText}>Continue with phone</Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Email - dark outline button */}
        <TouchableOpacity
          style={styles.emailButton}
          onPress={() => { resetForm(); setMode('email-login'); }}
          disabled={socialLoading !== null}
          activeOpacity={0.8}
        >
          <Ionicons name="mail-outline" size={18} color="rgba(255,255,255,0.6)" />
          <Text style={styles.emailButtonText}>Continue with email</Text>
        </TouchableOpacity>
      </View>

      {/* Terms */}
      <View style={styles.termsContainer}>
        <Text style={styles.terms}>
          Al crear una cuenta, aceptas nuestros
        </Text>
        <View style={styles.termsLinks}>
          <TouchableOpacity onPress={() => router.push('/legal/terms')}>
            <Text style={styles.termsLink}>Términos de Servicio</Text>
          </TouchableOpacity>
          <Text style={styles.terms}> y </Text>
          <TouchableOpacity onPress={() => router.push('/legal/privacy')}>
            <Text style={styles.termsLink}>Política de Privacidad</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );

  // Email form
  const renderEmailForm = () => (
    <View style={styles.formContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => setMode('options')}>
        <Ionicons name="chevron-back" size={28} color="#fff" />
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
          <Ionicons name="person-outline" size={20} color="rgba(255,255,255,0.5)" />
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        </View>
      )}

      <View style={styles.inputContainer}>
        <Ionicons name="mail-outline" size={20} color="rgba(255,255,255,0.5)" />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputContainer}>
        <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.5)" />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color="rgba(255,255,255,0.5)"
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
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.submitButtonText}>
            {mode === 'email-login' ? 'Sign In' : 'Create Account'}
          </Text>
        )}
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
    backgroundColor: '#0A0A0A',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 28,
  },

  // Options Screen
  optionsContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
    marginTop: 40,
  },
  logoTextWrapper: {
    alignItems: 'center',
  },
  logoVibe: {
    fontSize: 42,
    fontWeight: '300',
    color: '#fff',
    fontStyle: 'italic',
    letterSpacing: 1,
  },
  logoMeRow: {
    alignItems: 'center',
    marginTop: -2,
  },
  logoMe: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFD700',
    letterSpacing: 6,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 12,
  },

  // Auth Buttons
  authButtons: {
    gap: 12,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 28,
    paddingVertical: 14,
    gap: 10,
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#9B59B6',
    borderRadius: 28,
    paddingVertical: 13,
    gap: 10,
  },
  phoneButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  dividerText: {
    color: 'rgba(255,255,255,0.35)',
    paddingHorizontal: 14,
    fontSize: 12,
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 28,
    paddingVertical: 13,
    gap: 10,
  },
  emailButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
  },

  // Terms
  termsContainer: {
    alignItems: 'center',
    marginTop: 32,
    paddingBottom: 16,
  },
  terms: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
  termsLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 2,
  },
  termsLink: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: '500',
    textDecorationLine: 'underline',
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
    color: '#fff',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 32,
  },
  errorText: {
    color: '#FF4D4F',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    padding: 12,
    borderRadius: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  input: {
    flex: 1,
    height: 52,
    color: '#fff',
    fontSize: 15,
    marginLeft: 12,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#FFD700',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  switchMode: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  switchModeText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  switchModeLink: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
});
