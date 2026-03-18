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
const VIDEO_URL = 'https://drive.google.com/uc?export=download&id=1AXDQwqxWBTl8G2TKMnpOA-Pspnomr1ZE';
const FALLBACK_IMAGE = 'https://images.pexels.com/photos/1540406/pexels-photo-1540406.jpeg?auto=compress&cs=tinysrgb&w=800';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isLoading } = useAuth();
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        delay: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        delay: 300,
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
      <View style={styles.container}>
        <BackgroundMedia
          imageSource={FALLBACK_IMAGE}
          overlayOpacity={0.4}
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
        overlayOpacity={0.35}
        overlayGradient={true}
      />

      {/* Content */}
      <Animated.View
        style={[
          styles.content,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom + 16,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Brand Section - Centered */}
        <View style={styles.brandSection}>
          <Text style={styles.brandName}>See Me</Text>
          <Text style={styles.tagline}>Know the vibe before you arrive.</Text>
        </View>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          {/* Legal Text */}
          <Text style={styles.legalText}>
            By tapping 'Sign in' / 'Create account', you agree to our{' '}
            <Text style={styles.legalLink} onPress={handleTerms}>
              Terms of Service
            </Text>
            . Learn how we process your data in our{' '}
            <Text style={styles.legalLink} onPress={handlePrivacy}>
              Privacy Policy
            </Text>
            .
          </Text>

          {/* Primary Button */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleCreateAccount}
            activeOpacity={0.9}
          >
            <Text style={styles.primaryButtonText}>Create account</Text>
          </TouchableOpacity>

          {/* Secondary Button */}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleSignIn}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>Sign in</Text>
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
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  brandSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  brandName: {
    fontSize: 72,
    fontWeight: '400',
    color: '#ffffff',
    fontFamily: 'System',
    letterSpacing: -1,
    marginBottom: 12,
    // Elegant serif-like appearance
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tagline: {
    fontSize: 20,
    fontWeight: '400',
    color: '#ffffff',
    textAlign: 'center',
    opacity: 0.95,
    letterSpacing: 0.3,
  },
  bottomSection: {
    width: '100%',
    paddingBottom: 8,
  },
  legalText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  legalLink: {
    color: '#ffffff',
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  primaryButton: {
    backgroundColor: '#8B5CF6', // Purple like Hinge
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    // Subtle shadow
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
  },
});
