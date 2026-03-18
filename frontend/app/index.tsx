import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import BackgroundMedia from '../src/components/BackgroundMedia';

const { width } = Dimensions.get('window');

// Video/Image sources
const VIDEO_URL = 'https://videos.pexels.com/video-files/3121459/3121459-uhd_1440_2560_24fps.mp4';
const FALLBACK_IMAGE = 'https://images.pexels.com/photos/1540406/pexels-photo-1540406.jpeg?auto=compress&cs=tinysrgb&w=800';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isLoading } = useAuth();
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    // Animate content in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        delay: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        delay: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/(tabs)/explore');
    }
  }, [isAuthenticated, isLoading]);

  const handleCreateAccount = () => {
    router.push('/(auth)/signup');
  };

  const handleSignIn = () => {
    router.push('/(auth)/login');
  };

  const handleTerms = () => {
    router.push('/legal/terms');
  };

  const handlePrivacy = () => {
    router.push('/legal/privacy');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <BackgroundMedia
          imageSource={FALLBACK_IMAGE}
          overlayOpacity={0.5}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Background Video/Image */}
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
            paddingTop: insets.top + 60,
            paddingBottom: insets.bottom + 20,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Brand */}
        <View style={styles.brandSection}>
          <Text style={styles.brandName}>See Me</Text>
        </View>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Copy */}
        <View style={styles.copySection}>
          <Text style={styles.tagline}>
            Know the vibe{"\n"}before you arrive
          </Text>
          <Text style={styles.subtitle}>Live social radar</Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonsSection}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleCreateAccount}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#ff7b35', '#ec407a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButtonGradient}
            >
              <Text style={styles.primaryButtonText}>Create account</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleSignIn}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>Sign in</Text>
          </TouchableOpacity>
        </View>

        {/* Legal */}
        <View style={styles.legalSection}>
          <Text style={styles.legalText}>
            By continuing, you agree to our{' '}
            <Text style={styles.legalLink} onPress={handleTerms}>
              Terms of Service
            </Text>
            {' '}and{' '}
            <Text style={styles.legalLink} onPress={handlePrivacy}>
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
    backgroundColor: '#0a0a0a',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
  },
  brandSection: {
    alignItems: 'center',
  },
  brandName: {
    fontSize: 42,
    fontWeight: '300',
    color: '#ffffff',
    letterSpacing: 6,
    textTransform: 'uppercase',
  },
  spacer: {
    flex: 1,
  },
  copySection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  tagline: {
    fontSize: 32,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 42,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  buttonsSection: {
    width: '100%',
    marginBottom: 24,
  },
  primaryButton: {
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 16,
    // Glow effect
    shadowColor: '#ff7b35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    gap: 12,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  legalSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  legalText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.35)',
    textAlign: 'center',
    lineHeight: 18,
  },
  legalLink: {
    color: 'rgba(255, 255, 255, 0.5)',
    textDecorationLine: 'underline',
  },
});
