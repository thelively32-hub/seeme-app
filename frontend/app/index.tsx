import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import { useAuth } from '../src/context/AuthContext';
import COLORS from '../src/theme/colors';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isLoading } = useAuth();
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // Subtle pulse for the pin
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Redirect authenticated users
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/(tabs)/explore');
    }
  }, [isAuthenticated, isLoading]);

  const handleGetStarted = () => {
    router.push('/(auth)/login');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={['#000', '#0a0a0a']}
          style={StyleSheet.absoluteFill}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Background Video */}
      <Video
        source={{ uri: 'https://res.cloudinary.com/dxgtxlgyr/video/upload/v1773812258/See_me_intro_ready_hxj0xq.mp4' }}
        style={StyleSheet.absoluteFill}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping
        isMuted
      />

      {/* Dark Overlay */}
      <LinearGradient
        colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        style={[
          styles.content,
          {
            paddingTop: insets.top + 60,
            paddingBottom: insets.bottom + 24,
            opacity: fadeAnim,
          },
        ]}
      >
        {/* Main Content - Centered */}
        <View style={styles.mainContent}>
          {/* Small Pin with subtle animation */}
          <Animated.View style={[styles.pinContainer, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.pinOuter}>
              <View style={styles.pinInner}>
                <View style={styles.pinDot} />
              </View>
            </View>
          </Animated.View>

          {/* Logo */}
          <View style={styles.logoContainer}>
            <Text style={styles.logoVibe}>Vibe</Text>
            <Text style={styles.logoMe}>ME</Text>
          </View>

          {/* Tagline */}
          <Text style={styles.tagline}>
            Discover who's around your vibe
          </Text>
        </View>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          {/* Get Started Button */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleGetStarted}
            activeOpacity={0.9}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </TouchableOpacity>

          {/* Sign In Link */}
          <TouchableOpacity 
            style={styles.signInButton}
            onPress={handleGetStarted}
          >
            <Text style={styles.signInText}>
              Already have an account? <Text style={styles.signInLink}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'space-between',
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
  },
  
  // Pin - Small and elegant
  pinContainer: {
    marginBottom: 32,
  },
  pinOuter: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
    }),
  },
  pinInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFD700',
  },

  // Logo
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoVibe: {
    fontSize: 48,
    fontWeight: '300',
    color: '#fff',
    letterSpacing: 2,
    ...Platform.select({
      ios: { fontFamily: 'System' },
    }),
  },
  logoMe: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFD700',
    letterSpacing: 8,
    marginTop: 4,
  },

  // Tagline
  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  // Bottom Section
  bottomSection: {
    width: '100%',
  },
  primaryButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    letterSpacing: 0.5,
  },
  signInButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  signInText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  signInLink: {
    color: '#fff',
    fontWeight: '600',
  },
});
