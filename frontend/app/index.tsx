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
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import BackgroundMedia from '../src/components/BackgroundMedia';

const { width } = Dimensions.get('window');

// Video personalizado de SEE ME
const VIDEO_URL = 'https://res.cloudinary.com/dxgtxlgyr/video/upload/v1773812258/See_me_intro_ready_hxj0xq.mp4';
const FALLBACK_IMAGE = 'https://res.cloudinary.com/dxgtxlgyr/video/upload/v1773812258/See_me_intro_ready_hxj0xq.jpg';

// Colors - Brighter Gold theme for better contrast
const GOLD = '#E8D5B5';
const GOLD_LIGHT = '#F5EBD9';
const GOLD_BRIGHT = '#FFF8E7';
const GOLD_DARK = '#D4B896';

// Custom Location Pin Component
const LocationPin = ({ pulseAnim }: { pulseAnim: Animated.Value }) => {
  return (
    <View style={styles.pinWrapper}>
      {/* Glow effect underneath */}
      <Animated.View 
        style={[
          styles.pinGlow,
          { 
            transform: [{ scale: pulseAnim }],
            opacity: pulseAnim.interpolate({
              inputRange: [1, 1.1],
              outputRange: [0.5, 0.8],
            }),
          }
        ]} 
      />
      
      {/* Main pin shape */}
      <View style={styles.pinShape}>
        <LinearGradient
          colors={[GOLD_BRIGHT, GOLD_LIGHT, GOLD]}
          style={styles.pinGradient}
        >
          {/* Dark circle in center (eye effect) */}
          <View style={styles.pinEye} />
        </LinearGradient>
      </View>
      
      {/* Pin point/tail */}
      <View style={styles.pinTail} />
      
      {/* Small dot below */}
      <View style={styles.pinDot} />
    </View>
  );
};

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isLoading } = useAuth();
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

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

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
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
          overlayOpacity={0.6}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Background Video - Darker overlay for better contrast */}
      <BackgroundMedia
        videoSource={VIDEO_URL}
        imageSource={FALLBACK_IMAGE}
        overlayOpacity={0.58}
        overlayGradient={true}
      />

      {/* Content */}
      <Animated.View
        style={[
          styles.content,
          {
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 16,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Top Badge - Fixed */}
        <View style={styles.topBadge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>LIVE SOCIAL RADAR</Text>
        </View>

        {/* Logo Section */}
        <View style={styles.logoSection}>
          {/* Custom Location Pin */}
          <LocationPin pulseAnim={pulseAnim} />

          {/* Main Logo Text - Bigger & Bolder */}
          <View style={styles.logoTextContainer}>
            <Text style={styles.logoSee}>See</Text>
            <View style={styles.logoUnderline} />
            <Text style={styles.logoMe}>ME</Text>
          </View>
          
          {/* Tagline - More visible */}
          <Text style={styles.tagline}>Know the vibe first</Text>
        </View>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          {/* Primary Button */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleCreateAccount}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[GOLD_BRIGHT, GOLD_LIGHT, GOLD]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryButtonGradient}
            >
              <Text style={styles.primaryButtonText}>CREATE ACCOUNT</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Sign In Link */}
          <View style={styles.signInRow}>
            <Text style={styles.signInText}>Already have one? </Text>
            <TouchableOpacity onPress={handleSignIn} activeOpacity={0.7}>
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
  // Top Badge - Fixed visibility
  topBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingTop: 4,
  },
  badgeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: GOLD_LIGHT,
    // Glow
    shadowColor: GOLD_LIGHT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: GOLD_LIGHT,
    letterSpacing: 3,
    // Text shadow for better readability
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  // Logo Section
  logoSection: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingBottom: 20,
  },
  // Location Pin Styles
  pinWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  pinGlow: {
    position: 'absolute',
    bottom: -8,
    width: 90,
    height: 35,
    backgroundColor: GOLD_LIGHT,
    borderRadius: 45,
  },
  pinShape: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: GOLD_LIGHT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  pinGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinEye: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1a1a2e',
  },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderTopWidth: 20,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: GOLD,
    marginTop: -2,
  },
  pinDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GOLD_LIGHT,
    marginTop: 10,
    opacity: 0.8,
  },
  // Logo Text - Bigger & More visible
  logoTextContainer: {
    alignItems: 'center',
    marginTop: 12,
  },
  logoSee: {
    fontSize: 96,
    fontWeight: '300',
    color: GOLD_BRIGHT,
    fontStyle: 'italic',
    letterSpacing: 0,
    // Strong shadow for contrast
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
  },
  logoUnderline: {
    width: 60,
    height: 2,
    backgroundColor: GOLD_LIGHT,
    marginTop: -2,
    marginBottom: 12,
    // Glow effect
    shadowColor: GOLD_LIGHT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  logoMe: {
    fontSize: 28,
    fontWeight: '600',
    color: GOLD_LIGHT,
    letterSpacing: 18,
    marginLeft: 18,
    // Shadow for readability
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '600',
    color: GOLD_LIGHT,
    letterSpacing: 4,
    marginTop: 36,
    textTransform: 'uppercase',
    // Shadow for contrast
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  // Bottom Section
  bottomSection: {
    width: '100%',
    alignItems: 'center',
  },
  primaryButton: {
    width: '100%',
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: GOLD_LIGHT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  primaryButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
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
    color: 'rgba(255, 255, 255, 0.8)',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  signInLink: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '700',
    textDecorationLine: 'underline',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  legalText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  legalLink: {
    color: GOLD_LIGHT,
    textDecorationLine: 'underline',
  },
});
