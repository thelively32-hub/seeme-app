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

// Colors - Gold/Cream premium theme
const GOLD = '#D4B896';
const GOLD_LIGHT = '#E8DCC8';
const GOLD_DARK = '#C4A876';

// Custom Location Pin Component (like the eye/pin in the design)
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
              outputRange: [0.4, 0.7],
            }),
          }
        ]} 
      />
      
      {/* Main pin shape */}
      <View style={styles.pinShape}>
        <LinearGradient
          colors={[GOLD_LIGHT, GOLD, GOLD_DARK]}
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
    // Content fade in
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

    // Subtle pulse for the glow
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
          <Text style={styles.badgeText}>LIVE SOCIAL RADAR</Text>
        </View>

        {/* Logo Section */}
        <View style={styles.logoSection}>
          {/* Custom Location Pin with Eye */}
          <LocationPin pulseAnim={pulseAnim} />

          {/* Main Logo Text */}
          <View style={styles.logoTextContainer}>
            <Text style={styles.logoSee}>See</Text>
            <View style={styles.logoUnderline} />
            <Text style={styles.logoMe}>M E</Text>
          </View>
          
          {/* Tagline */}
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
              colors={[GOLD_LIGHT, GOLD, GOLD_DARK]}
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
    fontSize: 11,
    fontWeight: '600',
    color: GOLD,
    letterSpacing: 3,
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
    marginBottom: 16,
  },
  pinGlow: {
    position: 'absolute',
    bottom: -10,
    width: 80,
    height: 30,
    backgroundColor: GOLD,
    borderRadius: 40,
    opacity: 0.4,
  },
  pinShape: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    // Shadow
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  pinGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinEye: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1a1a2e',
  },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderTopWidth: 18,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: GOLD_DARK,
    marginTop: -2,
  },
  pinDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GOLD,
    marginTop: 8,
    opacity: 0.6,
  },
  // Logo Text
  logoTextContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  logoSee: {
    fontSize: 82,
    fontWeight: '300',
    color: GOLD_LIGHT,
    fontStyle: 'italic',
    letterSpacing: -1,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  logoUnderline: {
    width: 50,
    height: 1.5,
    backgroundColor: GOLD,
    marginTop: -4,
    marginBottom: 10,
  },
  logoMe: {
    fontSize: 24,
    fontWeight: '500',
    color: GOLD,
    letterSpacing: 16,
    marginLeft: 16,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '500',
    color: GOLD,
    letterSpacing: 4,
    marginTop: 32,
    textTransform: 'uppercase',
    opacity: 0.8,
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
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  primaryButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
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
