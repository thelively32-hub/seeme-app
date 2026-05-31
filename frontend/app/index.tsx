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
import { useAuth } from '../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isLoading } = useAuth();
  const [videoLoaded, setVideoLoaded] = useState(false);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const liveIndicator = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    // Fade in content
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // Subtle pulse for pin
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Live indicator blink
    Animated.loop(
      Animated.sequence([
        Animated.timing(liveIndicator, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(liveIndicator, {
          toValue: 0.3,
          duration: 600,
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
      {/* Background Video with Poster Image */}
      <Video
        source={{ uri: 'https://res.cloudinary.com/dxgtxlgyr/video/upload/v1748612258/See_me_intro_ready_hxj0xq.mp4' }}
        style={StyleSheet.absoluteFill}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping
        isMuted
        posterSource={{ uri: 'https://res.cloudinary.com/dxgtxlgyr/video/upload/so_0/v1748612258/See_me_intro_ready_hxj0xq.jpg' }}
        usePoster={true}
        posterStyle={StyleSheet.absoluteFill}
        onLoad={() => setVideoLoaded(true)}
        onError={(e) => console.log('Video error:', e)}
      />

      {/* Dark Gradient Overlay */}
      <LinearGradient
        colors={[
          'rgba(0,0,0,0.3)',
          'rgba(0,0,0,0.4)',
          'rgba(0,0,0,0.85)',
        ]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        style={[
          styles.content,
          {
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 20,
            opacity: fadeAnim,
          },
        ]}
      >
        {/* Top: LIVE Social Radar Indicator */}
        <View style={styles.topSection}>
          <View style={styles.liveContainer}>
            <Animated.View style={[styles.liveBadge, { opacity: liveIndicator }]}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </Animated.View>
            <Text style={styles.socialRadarText}>SOCIAL RADAR</Text>
          </View>
        </View>

        {/* Center: Logo */}
        <View style={styles.centerSection}>
          {/* Logo "Vibe" */}
          <Text style={styles.logoVibe}>Vibe</Text>
          
          {/* Golden line + "M E" */}
          <View style={styles.logoMeContainer}>
            <View style={styles.goldenLine} />
            <View style={styles.meRow}>
              <Text style={styles.logoM}>M</Text>
              <Text style={styles.logoE}>E</Text>
            </View>
          </View>

          {/* Pin Icon - Small and below the logo */}
          <Animated.View
            style={[
              styles.pinContainer,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Ionicons name="location" size={28} color="#FFD700" />
          </Animated.View>

          {/* Tagline */}
          <Text style={styles.tagline}>
            DISCOVER WHO'S AROUND{'\n'}YOUR VIBE
          </Text>
        </View>

        {/* Bottom: Buttons */}
        <View style={styles.bottomSection}>
          {/* Create Account Button */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleGetStarted}
            activeOpacity={0.9}
          >
            <Text style={styles.primaryButtonText}>CREATE ACCOUNT</Text>
          </TouchableOpacity>

          {/* Sign In Link */}
          <TouchableOpacity
            style={styles.signInButton}
            onPress={handleGetStarted}
            activeOpacity={0.7}
          >
            <Text style={styles.signInText}>
              Already have one? <Text style={styles.signInLink}>Sign in</Text>
            </Text>
          </TouchableOpacity>

          {/* Terms */}
          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By continuing you agree to our{' '}
              <Text style={styles.termsLink}>Terms of Service</Text>.
            </Text>
            <Text style={styles.termsText}>
              See our <Text style={styles.termsLink}>Privacy Policy</Text>.
            </Text>
          </View>
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
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },

  // Top Section - LIVE indicator
  topSection: {
    alignItems: 'center',
    paddingTop: 8,
  },
  liveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  liveText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  socialRadarText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 2,
  },

  // Center Section - Logo
  centerSection: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  logoVibe: {
    fontSize: 72,
    fontWeight: '300',
    fontStyle: 'italic',
    color: '#FFFFFF',
    letterSpacing: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  logoMeContainer: {
    alignItems: 'center',
    marginTop: -8,
  },
  goldenLine: {
    width: 50,
    height: 2,
    backgroundColor: '#FFD700',
    marginBottom: 8,
  },
  meRow: {
    flexDirection: 'row',
    gap: 24,
  },
  logoM: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFD700',
    letterSpacing: 4,
  },
  logoE: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFD700',
    letterSpacing: 4,
  },
  pinContainer: {
    marginTop: 40,
    marginBottom: 16,
  },
  tagline: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    letterSpacing: 3,
    lineHeight: 20,
    fontWeight: '500',
  },

  // Bottom Section - Buttons
  bottomSection: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  primaryButton: {
    width: '100%',
    maxWidth: 300,
    backgroundColor: '#FFD700',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 16,
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
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 1,
  },
  signInButton: {
    paddingVertical: 10,
    marginBottom: 16,
  },
  signInText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  signInLink: {
    color: '#FFFFFF',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  termsContainer: {
    alignItems: 'center',
  },
  termsText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    textDecorationLine: 'underline',
  },
});
