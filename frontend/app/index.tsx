import React, { useEffect, useRef } from 'react';
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
import { useAuth } from '../src/context/AuthContext';
import Svg, { Circle, Path, Defs, RadialGradient, Stop } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

// Animated SVG component for radar rings
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isLoading } = useAuth();
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const liveIndicator = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    // Fade in content
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Radar rings animation - staggered
    const animateRing = (ring: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(ring, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(ring, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
    };

    animateRing(ring1, 0).start();
    animateRing(ring2, 1000).start();
    animateRing(ring3, 2000).start();

    // Subtle pulse for pin
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Live indicator blink
    Animated.loop(
      Animated.sequence([
        Animated.timing(liveIndicator, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(liveIndicator, {
          toValue: 0.4,
          duration: 800,
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
          colors={['#050505', '#0a0510', '#050505']}
          style={StyleSheet.absoluteFill}
        />
      </View>
    );
  }

  // Interpolate ring animations
  const ring1Scale = ring1.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1.8],
  });
  const ring1Opacity = ring1.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0.6, 0.3, 0],
  });
  const ring2Scale = ring2.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1.8],
  });
  const ring2Opacity = ring2.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0.6, 0.3, 0],
  });
  const ring3Scale = ring3.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1.8],
  });
  const ring3Opacity = ring3.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0.6, 0.3, 0],
  });

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

      {/* Dark Gradient Overlay with purple tint */}
      <LinearGradient
        colors={[
          'rgba(5,5,5,0.5)',
          'rgba(10,5,16,0.75)',
          'rgba(5,5,5,0.92)',
        ]}
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
        {/* Top: Social Radar Indicator */}
        <View style={styles.topSection}>
          <View style={styles.liveIndicator}>
            <Animated.View style={[styles.liveDot, { opacity: liveIndicator }]} />
            <Text style={styles.liveText}>SOCIAL RADAR</Text>
          </View>
        </View>

        {/* Center: Logo with Radar Rings */}
        <View style={styles.centerSection}>
          {/* Radar Rings Container */}
          <View style={styles.radarContainer}>
            {/* Animated Rings */}
            <Animated.View
              style={[
                styles.radarRing,
                {
                  transform: [{ scale: ring1Scale }],
                  opacity: ring1Opacity,
                },
              ]}
            />
            <Animated.View
              style={[
                styles.radarRing,
                styles.radarRing2,
                {
                  transform: [{ scale: ring2Scale }],
                  opacity: ring2Opacity,
                },
              ]}
            />
            <Animated.View
              style={[
                styles.radarRing,
                styles.radarRing3,
                {
                  transform: [{ scale: ring3Scale }],
                  opacity: ring3Opacity,
                },
              ]}
            />

            {/* Center Pin with Eye Icon */}
            <Animated.View
              style={[
                styles.pinWrapper,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <View style={styles.pinOuter}>
                <View style={styles.pinInner}>
                  {/* Stylized Eye */}
                  <Svg width={28} height={28} viewBox="0 0 24 24">
                    <Path
                      d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
                      fill="#000000"
                    />
                  </Svg>
                </View>
              </View>
            </Animated.View>
          </View>

          {/* Logo Text */}
          <View style={styles.logoContainer}>
            <Text style={styles.logoVibe}>Vibe</Text>
            <View style={styles.logoMeContainer}>
              <View style={styles.logoLine} />
              <View style={styles.logoMeRow}>
                <Text style={styles.logoM}>M</Text>
                <Text style={styles.logoE}>E</Text>
              </View>
            </View>
          </View>

          {/* Tagline */}
          <Text style={styles.tagline}>
            DISCOVER WHO'S AROUND{'\n'}YOUR VIBE, RIGHT NOW
          </Text>
        </View>

        {/* Bottom: Buttons */}
        <View style={styles.bottomSection}>
          {/* Create Account Button - Elegant Gold */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleGetStarted}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#FFD700', '#F5C400', '#E5B400']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryButtonGradient}
            >
              <Text style={styles.primaryButtonText}>CREATE ACCOUNT</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Sign In Link */}
          <TouchableOpacity
            style={styles.signInButton}
            onPress={handleGetStarted}
            activeOpacity={0.7}
          >
            <Text style={styles.signInText}>
              Already have an account? <Text style={styles.signInLink}>Sign in</Text>
            </Text>
          </TouchableOpacity>

          {/* Terms */}
          <Text style={styles.termsText}>
            By continuing you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
  },
  loadingContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
  },

  // Top Section
  topSection: {
    alignItems: 'center',
    paddingTop: 12,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
  liveText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 3,
  },

  // Center Section
  centerSection: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  radarContainer: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  radarRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1.5,
    borderColor: 'rgba(180, 100, 255, 0.5)',
  },
  radarRing2: {
    borderColor: 'rgba(200, 120, 255, 0.4)',
  },
  radarRing3: {
    borderColor: 'rgba(220, 140, 255, 0.3)',
  },
  pinWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinOuter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  pinInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#B8860B',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Logo
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoVibe: {
    fontSize: 52,
    fontWeight: '300',
    fontStyle: 'italic',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  logoMeContainer: {
    alignItems: 'center',
    marginTop: -4,
  },
  logoLine: {
    width: 40,
    height: 2,
    backgroundColor: '#FFD700',
    marginBottom: 6,
  },
  logoMeRow: {
    flexDirection: 'row',
    gap: 20,
  },
  logoM: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFD700',
    letterSpacing: 2,
  },
  logoE: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFD700',
    letterSpacing: 2,
  },

  // Tagline
  tagline: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    letterSpacing: 2,
    lineHeight: 20,
  },

  // Bottom Section
  bottomSection: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  primaryButton: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
  },
  primaryButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 1.5,
  },
  signInButton: {
    paddingVertical: 8,
    marginBottom: 16,
  },
  signInText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
  signInLink: {
    color: '#FFFFFF',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  termsText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    lineHeight: 16,
  },
  termsLink: {
    textDecorationLine: 'underline',
  },
});
