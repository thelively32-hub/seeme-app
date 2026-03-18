import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import BackgroundMedia from '../src/components/BackgroundMedia';

const { width } = Dimensions.get('window');

// Video personalizado de SEE ME
const VIDEO_URL = 'https://res.cloudinary.com/dxgtxlgyr/video/upload/v1773812258/See_me_intro_ready_hxj0xq.mp4';
const FALLBACK_IMAGE = 'https://res.cloudinary.com/dxgtxlgyr/video/upload/v1773812258/See_me_intro_ready_hxj0xq.jpg';

// Colors - Gold/Cream theme
const GOLD = '#D4B896';
const GOLD_LIGHT = '#E8DCC8';
const GOLD_DARK = '#B89B6A';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isLoading } = useAuth();
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        delay: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        delay: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleCreateAccount = () => {
    if (isAuthenticated) {
      router.replace('/(tabs)/explore');
    } else {
      router.push('/(auth)/signup');
    }
  };

  const handleSignIn = () => {
    if (isAuthenticated) {
      router.replace('/(tabs)/explore');
    } else {
      router.push('/(auth)/login');
    }
  };

  const handleTerms = () => {
    router.push('/legal/terms');
  };

  const handlePrivacy = () => {
    router.push('/legal/privacy');
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <BackgroundMedia
          videoSource={VIDEO_URL}
          imageSource={FALLBACK_IMAGE}
          overlayOpacity={0.5}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Background Video */}
      <BackgroundMedia
        videoSource={VIDEO_URL}
        imageSource={FALLBACK_IMAGE}
        overlayOpacity={0.45}
        overlayGradient={true}
      />

      {/* Content */}
      <Animated.View
        style={[
          styles.content,
          {
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 16,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Top Badge */}
        <View style={styles.topBadge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>REAL PLACES · REAL PEOPLE</Text>
        </View>

        {/* Logo Section - Centered */}
        <View style={styles.logoSection}>
          <Text style={styles.logoSee}>See</Text>
          <View style={styles.logoUnderline} />
          <Text style={styles.logoMe}>M E</Text>
          
          {/* Tagline */}
          <Text style={styles.tagline}>Know the vibe before arrive</Text>
        </View>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          {/* Primary Button - Gold */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleCreateAccount}
            activeOpacity={0.9}
          >
            <Text style={styles.primaryButtonText}>CREATE ACCOUNT</Text>
          </TouchableOpacity>

          {/* Sign In Link */}
          <View style={styles.signInRow}>
            <Text style={styles.signInText}>Already have one? </Text>
            <TouchableOpacity onPress={handleSignIn}>
              <Text style={styles.signInLink}>Sign in</Text>
            </TouchableOpacity>
          </View>

          {/* Legal Text */}
          <Text style={styles.legalText}>
            By continuing you agree to our{' '}
            <Text style={styles.legalLink} onPress={handleTerms}>
              Terms of Service
            </Text>
            .{'\n'}See our{' '}
            <Text style={styles.legalLink} onPress={handlePrivacy}>
              Privacy Policy
            </Text>
            .
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 28,
  },
  // Top Badge
  topBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GOLD,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: GOLD,
    letterSpacing: 2,
  },
  // Logo Section
  logoSection: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingBottom: 40,
  },
  logoSee: {
    fontSize: 90,
    fontWeight: '300',
    color: GOLD_LIGHT,
    fontStyle: 'italic',
    letterSpacing: -2,
    // Elegant serif appearance
    fontFamily: 'System',
  },
  logoUnderline: {
    width: 60,
    height: 1,
    backgroundColor: GOLD,
    marginTop: -8,
    marginBottom: 8,
  },
  logoMe: {
    fontSize: 28,
    fontWeight: '400',
    color: GOLD,
    letterSpacing: 12,
    marginTop: 4,
  },
  tagline: {
    fontSize: 15,
    fontWeight: '400',
    color: GOLD,
    letterSpacing: 3,
    marginTop: 40,
    textTransform: 'uppercase',
    opacity: 0.8,
  },
  // Bottom Section
  bottomSection: {
    width: '100%',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: GOLD_LIGHT,
    borderRadius: 30,
    paddingVertical: 18,
    paddingHorizontal: 60,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    letterSpacing: 2,
  },
  signInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },
  signInText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  signInLink: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  legalText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    lineHeight: 20,
  },
  legalLink: {
    color: GOLD,
    textDecorationLine: 'underline',
  },
});
