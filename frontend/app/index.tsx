import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
  Platform,
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

// Premium Gold Color Palette - More vibrant & luxurious
const COLORS = {
  // Primary Golds
  goldBright: '#FFD700',      // Vivid gold - highlights
  goldPrimary: '#F4C542',     // Rich gold - main elements
  goldLight: '#FFE566',       // Soft gold - accents
  goldPremium: '#E8B923',     // Deep gold - shadows
  
  // Neutrals
  cream: '#FFF8E7',           // Warm white
  champagne: '#F5E6C8',       // Elegant cream
  
  // Live indicator
  liveRed: '#FF3B30',         // Apple red for live
  liveGlow: '#FF6B6B',        // Softer glow
  
  // Text
  textDark: '#1A1A1A',
  textLight: '#FFFFFF',
};

// Animated Live Pulse Component - Like Instagram Live
const LivePulse = ({ pulseAnim }: { pulseAnim: Animated.Value }) => {
  return (
    <View style={styles.livePulseContainer}>
      {/* Outer pulse ring */}
      <Animated.View
        style={[
          styles.livePulseOuter,
          {
            transform: [{ scale: pulseAnim }],
            opacity: pulseAnim.interpolate({
              inputRange: [1, 1.8],
              outputRange: [0.6, 0],
            }),
          },
        ]}
      />
      {/* Middle pulse ring */}
      <Animated.View
        style={[
          styles.livePulseMiddle,
          {
            transform: [
              {
                scale: pulseAnim.interpolate({
                  inputRange: [1, 1.8],
                  outputRange: [1, 1.4],
                }),
              },
            ],
            opacity: pulseAnim.interpolate({
              inputRange: [1, 1.8],
              outputRange: [0.8, 0.2],
            }),
          },
        ]}
      />
      {/* Core dot */}
      <View style={styles.liveDotCore} />
    </View>
  );
};

// Classic Location Pin - Teardrop shape with concentric rings
const PremiumLocationPin = ({ pulseAnim }: { pulseAnim: Animated.Value }) => {
  return (
    <View style={styles.pinContainer}>
      {/* Concentric rings underneath - radar effect */}
      <View style={styles.ringsContainer}>
        <Animated.View
          style={[
            styles.ringOuter,
            {
              transform: [
                {
                  scale: pulseAnim.interpolate({
                    inputRange: [1, 1.8],
                    outputRange: [1, 1.3],
                  }),
                },
              ],
              opacity: pulseAnim.interpolate({
                inputRange: [1, 1.8],
                outputRange: [0.6, 0],
              }),
            },
          ]}
        />
        <Animated.View
          style={[
            styles.ringMiddle,
            {
              transform: [
                {
                  scale: pulseAnim.interpolate({
                    inputRange: [1, 1.8],
                    outputRange: [1, 1.2],
                  }),
                },
              ],
              opacity: pulseAnim.interpolate({
                inputRange: [1, 1.8],
                outputRange: [0.8, 0.2],
              }),
            },
          ]}
        />
        <View style={styles.ringInner} />
      </View>

      {/* Main Pin - Teardrop shape */}
      <View style={styles.teardropContainer}>
        {/* Pin head (circle part) */}
        <View style={styles.pinHead}>
          <LinearGradient
            colors={[COLORS.goldBright, COLORS.goldPrimary, COLORS.goldPremium]}
            start={{ x: 0.3, y: 0 }}
            end={{ x: 0.7, y: 1 }}
            style={styles.pinHeadGradient}
          >
            {/* White/light circle in center */}
            <View style={styles.pinCenterCircle} />
          </LinearGradient>
        </View>

        {/* Pin tail (pointed part) */}
        <View style={styles.pinTailWrapper}>
          <LinearGradient
            colors={[COLORS.goldPrimary, COLORS.goldPremium]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.pinTailGradient}
          />
        </View>
      </View>
    </View>
  );
};

// Premium Button with Shine Effect
const PremiumButton = ({
  onPress,
  title,
  shineAnim,
}: {
  onPress: () => void;
  title: string;
  shineAnim: Animated.Value;
}) => {
  return (
    <TouchableOpacity
      style={styles.premiumButton}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={[COLORS.goldBright, COLORS.goldPrimary, COLORS.goldPremium]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.premiumButtonGradient}
      >
        {/* Shine overlay animation */}
        <Animated.View
          style={[
            styles.buttonShine,
            {
              transform: [
                {
                  translateX: shineAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-100, width + 100],
                  }),
                },
              ],
            },
          ]}
        />
        <Text style={styles.premiumButtonText}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isLoading } = useAuth();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shineAnim = useRef(new Animated.Value(0)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Main entrance animation
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
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
      Animated.spring(logoScaleAnim, {
        toValue: 1,
        delay: 400,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Live pulse animation - continuous
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.8,
          duration: 1500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Button shine animation - periodic
    const shineLoop = () => {
      Animated.sequence([
        Animated.delay(3000),
        Animated.timing(shineAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shineAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]).start(() => shineLoop());
    };
    shineLoop();
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
          overlayOpacity={0.55}
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
        overlayOpacity={0.52}
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
        {/* Top Badge - LIVE indicator */}
        <View style={styles.topBadge}>
          <View style={styles.liveBadge}>
            <LivePulse pulseAnim={pulseAnim} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
          <Text style={styles.badgeText}>SOCIAL RADAR</Text>
        </View>

        {/* Logo Section */}
        <Animated.View
          style={[
            styles.logoSection,
            {
              transform: [{ scale: logoScaleAnim }],
            },
          ]}
        >
          {/* Premium Location Pin */}
          <PremiumLocationPin pulseAnim={pulseAnim} />

          {/* Main Logo Text */}
          <View style={styles.logoTextContainer}>
            {/* "See" with custom styling */}
            <Text style={styles.logoSee}>See</Text>

            {/* Decorative line */}
            <LinearGradient
              colors={[COLORS.goldBright, COLORS.goldPrimary, COLORS.goldBright]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.logoLine}
            />

            {/* "ME" with letter spacing */}
            <View style={styles.logoMeContainer}>
              <Text style={styles.logoMeLetter}>M</Text>
              <Text style={styles.logoMeSpace}> </Text>
              <Text style={styles.logoMeLetter}>E</Text>
            </View>
          </View>

          {/* Premium Tagline */}
          <View style={styles.taglineContainer}>
            <View style={styles.taglineLine} />
            <Text style={styles.tagline}>KNOW THE VIBE FIRST</Text>
            <View style={styles.taglineLine} />
          </View>
        </Animated.View>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          {/* Premium CTA Button */}
          <PremiumButton
            onPress={handleCreateAccount}
            title="CREATE ACCOUNT"
            shineAnim={shineAnim}
          />

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

  // ========== TOP BADGE / LIVE INDICATOR ==========
  topBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  livePulseContainer: {
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  livePulseOuter: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.liveRed,
  },
  livePulseMiddle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.liveGlow,
  },
  liveDotCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.liveRed,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.liveRed,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  liveText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.liveRed,
    letterSpacing: 1,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.cream,
    letterSpacing: 3,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // ========== LOGO SECTION ==========
  logoSection: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingBottom: 10,
  },

  // Classic Location Pin Styles - Teardrop with rings
  pinContainer: {
    alignItems: 'center',
    marginBottom: 20,
    height: 160,
    justifyContent: 'flex-end',
  },
  
  // Concentric rings (radar effect)
  ringsContainer: {
    position: 'absolute',
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
    height: 40,
  },
  ringOuter: {
    position: 'absolute',
    width: 90,
    height: 35,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: COLORS.goldPrimary,
    backgroundColor: 'transparent',
  },
  ringMiddle: {
    position: 'absolute',
    width: 60,
    height: 24,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: COLORS.goldPrimary,
    backgroundColor: 'transparent',
  },
  ringInner: {
    width: 30,
    height: 12,
    borderRadius: 15,
    backgroundColor: COLORS.goldPrimary,
    opacity: 0.7,
  },
  
  // Teardrop pin
  teardropContainer: {
    alignItems: 'center',
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.goldBright,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
      },
      android: {
        elevation: 15,
      },
    }),
  },
  pinHead: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
  },
  pinHeadGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinCenterCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.cream,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
    }),
  },
  pinTailWrapper: {
    marginTop: -8,
    width: 36,
    height: 40,
    overflow: 'hidden',
  },
  pinTailGradient: {
    width: 36,
    height: 36,
    transform: [{ rotate: '45deg' }, { translateY: -18 }],
    borderRadius: 6,
  },

  // Logo Text Styles
  logoTextContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  logoSee: {
    fontSize: 100,
    fontWeight: '300',
    color: COLORS.cream,
    fontStyle: 'italic',
    letterSpacing: -2,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 15,
    ...Platform.select({
      ios: {
        fontFamily: 'Georgia',
      },
    }),
  },
  logoLine: {
    width: 70,
    height: 3,
    borderRadius: 2,
    marginTop: -8,
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.goldBright,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
      },
    }),
  },
  logoMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoMeLetter: {
    fontSize: 32,
    fontWeight: '600',
    color: COLORS.goldPrimary,
    letterSpacing: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  logoMeSpace: {
    width: 16,
  },

  // Tagline Styles
  taglineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 32,
    gap: 12,
  },
  taglineLine: {
    width: 24,
    height: 1,
    backgroundColor: COLORS.goldPrimary,
    opacity: 0.5,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.champagne,
    letterSpacing: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // ========== BOTTOM SECTION ==========
  bottomSection: {
    width: '100%',
    alignItems: 'center',
  },

  // Premium Button Styles
  premiumButton: {
    width: '100%',
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.goldBright,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
      },
      android: {
        elevation: 15,
      },
    }),
  },
  premiumButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 30,
    overflow: 'hidden',
  },
  buttonShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 60,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    transform: [{ skewX: '-20deg' }],
  },
  premiumButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
    letterSpacing: 2.5,
  },

  // Sign In Styles
  signInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  signInText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.75)',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  signInLink: {
    fontSize: 15,
    color: COLORS.textLight,
    fontWeight: '700',
    textDecorationLine: 'underline',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Legal Text Styles
  legalText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.55)',
    textAlign: 'center',
    lineHeight: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  legalLink: {
    color: COLORS.champagne,
    textDecorationLine: 'underline',
  },
});
