import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import COLORS from '../src/theme/colors';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isLoading } = useAuth();
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  
  // Radar pulse animations (3 waves)
  const radar1 = useRef(new Animated.Value(0)).current;
  const radar2 = useRef(new Animated.Value(0)).current;
  const radar3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Initial fade in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Slow floating animation for pin (3 seconds)
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -3,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Slow radar pulse animation (4-5 seconds per cycle)
    const startRadarAnimation = () => {
      const animateWave = (anim: Animated.Value, delay: number) => {
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, {
              toValue: 1,
              duration: 4000,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        ).start();
      };

      animateWave(radar1, 0);
      animateWave(radar2, 1300);
      animateWave(radar3, 2600);
    };

    startRadarAnimation();
  }, []);

  // Redirect authenticated users
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/(tabs)/explore');
    }
  }, [isAuthenticated, isLoading]);

  const handleCreateAccount = () => {
    router.push('/(auth)/login');
  };

  const handleSignIn = () => {
    router.push('/(auth)/login');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={COLORS.gradients.darkBackground}
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
        colors={['rgba(5,5,5,0.6)', 'rgba(5,5,5,0.85)', 'rgba(5,5,5,0.95)']}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        style={[
          styles.content,
          {
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 20,
            opacity: fadeAnim,
          },
        ]}
      >
        {/* Live Social Radar Badge */}
        <View style={styles.liveBadge}>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
          </View>
          <Text style={styles.liveText}>SOCIAL RADAR</Text>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          {/* Radar Waves */}
          <View style={styles.radarContainer}>
            <Animated.View
              style={[
                styles.radarWave,
                {
                  transform: [
                    { scale: radar1.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 2.5],
                      })
                    }
                  ],
                  opacity: radar1.interpolate({
                    inputRange: [0, 0.2, 1],
                    outputRange: [0, 0.15, 0],
                  }),
                },
              ]}
            />
            <Animated.View
              style={[
                styles.radarWave,
                {
                  transform: [
                    { scale: radar2.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 2.5],
                      })
                    }
                  ],
                  opacity: radar2.interpolate({
                    inputRange: [0, 0.2, 1],
                    outputRange: [0, 0.15, 0],
                  }),
                },
              ]}
            />
            <Animated.View
              style={[
                styles.radarWave,
                {
                  transform: [
                    { scale: radar3.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 2.5],
                      })
                    }
                  ],
                  opacity: radar3.interpolate({
                    inputRange: [0, 0.2, 1],
                    outputRange: [0, 0.15, 0],
                  }),
                },
              ]}
            />

            {/* Pin Icon with Glow */}
            <Animated.View
              style={[
                styles.pinContainer,
                {
                  transform: [
                    { translateY: floatAnim },
                    { scale: logoScale },
                  ],
                },
              ]}
            >
              {/* Glow Effect */}
              <View style={styles.pinGlow} />
              
              {/* Pin Body */}
              <LinearGradient
                colors={[COLORS.gold.bright, COLORS.gold.primary, COLORS.gold.medium]}
                style={styles.pinBody}
              >
                {/* Eye/Radar Icon */}
                <View style={styles.pinEye}>
                  <Ionicons name="eye" size={28} color={COLORS.background.primary} />
                </View>
              </LinearGradient>
              
              {/* Pin Tip */}
              <View style={styles.pinTip} />
            </Animated.View>
          </View>

          {/* Logo Text */}
          <Animated.View style={[styles.logoTextContainer, { transform: [{ scale: logoScale }] }]}>
            <Text style={styles.logoVibe}>Vibe</Text>
            <View style={styles.logoLine} />
            <Text style={styles.logoMe}>M E</Text>
          </Animated.View>
        </View>

        {/* Tagline */}
        <View style={styles.taglineContainer}>
          <Text style={styles.tagline}>DISCOVER WHO'S AROUND</Text>
          <Text style={styles.tagline}>YOUR VIBE, RIGHT NOW</Text>
        </View>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          {/* Create Account Button */}
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateAccount}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={COLORS.gradients.goldButton}
              style={styles.createButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.createButtonText}>CREATE ACCOUNT</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Sign In Link */}
          <View style={styles.signInContainer}>
            <Text style={styles.signInText}>Already have an account? </Text>
            <TouchableOpacity onPress={handleSignIn}>
              <Text style={styles.signInLink}>Sign in</Text>
            </TouchableOpacity>
          </View>

          {/* Terms */}
          <Text style={styles.terms}>
            By continuing you agree to our{' '}
            <Text style={styles.termsLink} onPress={() => router.push('/legal/terms')}>
              Terms of Service
            </Text>
            {' '}and{' '}
            <Text style={styles.termsLink} onPress={() => router.push('/legal/privacy')}>
              Privacy Policy
            </Text>
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  loadingContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },

  // Live Badge
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.live.red,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.live.red,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 6,
      },
    }),
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.live.red,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.secondary,
    letterSpacing: 3,
  },

  // Hero Section
  heroSection: {
    alignItems: 'center',
    marginTop: 40,
  },
  radarContainer: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarWave: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1.5,
    borderColor: COLORS.gold.primary,
  },
  pinContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.gold.glow,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.gold.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 30,
      },
    }),
  },
  pinBody: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderBottomLeftRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '45deg' }],
  },
  pinEye: {
    transform: [{ rotate: '-45deg' }],
  },
  pinTip: {
    width: 0,
    height: 0,
    marginTop: -5,
  },

  // Logo
  logoTextContainer: {
    alignItems: 'center',
    marginTop: 30,
  },
  logoVibe: {
    fontSize: 72,
    fontWeight: '200',
    color: COLORS.text.primary,
    fontStyle: 'italic',
    letterSpacing: -2,
    ...Platform.select({
      ios: {
        fontFamily: 'Georgia',
      },
    }),
  },
  logoLine: {
    width: 50,
    height: 2,
    backgroundColor: COLORS.gold.primary,
    marginVertical: 8,
    borderRadius: 1,
  },
  logoMe: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.gold.primary,
    letterSpacing: 12,
  },

  // Tagline
  taglineContainer: {
    alignItems: 'center',
    marginTop: 30,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text.muted,
    letterSpacing: 3,
    lineHeight: 22,
  },

  // CTA Section
  ctaSection: {
    width: '100%',
    alignItems: 'center',
  },
  createButton: {
    width: '100%',
    borderRadius: 28,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.gold.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  createButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.background.primary,
    letterSpacing: 2,
  },
  signInContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  signInText: {
    fontSize: 15,
    color: COLORS.text.secondary,
  },
  signInLink: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.primary,
    textDecorationLine: 'underline',
  },
  terms: {
    fontSize: 12,
    color: COLORS.text.muted,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
  },
  termsLink: {
    color: COLORS.text.secondary,
    textDecorationLine: 'underline',
  },
});
