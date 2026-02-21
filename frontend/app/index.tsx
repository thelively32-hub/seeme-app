import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// SEE ME Logo Component - Modern minimal eye with subtle smile
const SeeMeLogo = ({ size = 80 }: { size?: number }) => {
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id="eyeGradient" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#a78bfa" />
            <Stop offset="100%" stopColor="#7c3aed" />
          </RadialGradient>
          <RadialGradient id="irisGradient" cx="50%" cy="40%" r="50%">
            <Stop offset="0%" stopColor="#60a5fa" />
            <Stop offset="100%" stopColor="#1e40af" />
          </RadialGradient>
        </Defs>
        
        {/* Outer eye shape - elegant almond */}
        <Path
          d="M50 25 C75 25 95 50 95 50 C95 50 75 75 50 75 C25 75 5 50 5 50 C5 50 25 25 50 25"
          fill="url(#eyeGradient)"
          opacity={0.9}
        />
        
        {/* Inner white/light area */}
        <Path
          d="M50 30 C70 30 85 50 85 50 C85 50 70 70 50 70 C30 70 15 50 15 50 C15 50 30 30 50 30"
          fill="#f8fafc"
          opacity={0.95}
        />
        
        {/* Iris */}
        <Circle cx="50" cy="50" r="18" fill="url(#irisGradient)" />
        
        {/* Pupil */}
        <Circle cx="50" cy="50" r="8" fill="#0f172a" />
        
        {/* Pupil highlight */}
        <Circle cx="46" cy="46" r="3" fill="#ffffff" opacity={0.8} />
        
        {/* Subtle smile curve below eye */}
        <Path
          d="M35 80 Q50 90 65 80"
          stroke="#a78bfa"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          opacity={0.8}
        />
      </Svg>
    </View>
  );
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  
  // Animation values
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.8);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(20);
  const buttonsOpacity = useSharedValue(0);
  const buttonsTranslateY = useSharedValue(30);

  useEffect(() => {
    // Animate logo
    logoOpacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
    logoScale.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.back) });
    
    // Animate text
    textOpacity.value = withDelay(300, withTiming(1, { duration: 600 }));
    textTranslateY.value = withDelay(300, withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }));
    
    // Animate buttons
    buttonsOpacity.value = withDelay(600, withTiming(1, { duration: 600 }));
    buttonsTranslateY.value = withDelay(600, withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }));
  }, []);

  const animatedLogoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const animatedButtonsStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
    transform: [{ translateY: buttonsTranslateY.value }],
  }));

  const handleGetStarted = () => {
    // Navigate to onboarding/registration
    console.log('Get Started pressed');
  };

  const handleLogin = () => {
    // Navigate to login
    console.log('Log In pressed');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <LinearGradient
        colors={['#1a0a2e', '#0f1629', '#0a1628']}
        style={styles.gradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <View style={[styles.content, { paddingTop: insets.top + 60 }]}>
          {/* Logo Section */}
          <Animated.View style={[styles.logoContainer, animatedLogoStyle]}>
            <SeeMeLogo size={90} />
            <Text style={styles.brandName}>SEE ME</Text>
          </Animated.View>

          {/* Text Section */}
          <Animated.View style={[styles.textContainer, animatedTextStyle]}>
            <Text style={styles.headline}>Be Seen. Connect.</Text>
            <Text style={styles.subtitle}>Real-time verified presence, worldwide.</Text>
          </Animated.View>

          {/* Spacer */}
          <View style={styles.spacer} />

          {/* Buttons Section */}
          <Animated.View style={[styles.buttonsContainer, animatedButtonsStyle, { paddingBottom: insets.bottom + 40 }]}>
            {/* Primary Button */}
            <TouchableOpacity
              style={styles.primaryButtonWrapper}
              onPress={handleGetStarted}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#8b5cf6', '#6366f1', '#4f46e5']}
                style={styles.primaryButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.primaryButtonText}>Get Started</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Secondary Button */}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleLogin}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Log In</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  brandName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 6,
    marginTop: 16,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 48,
  },
  headline: {
    fontSize: 32,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginTop: 12,
    letterSpacing: 0.3,
  },
  spacer: {
    flex: 1,
  },
  buttonsContainer: {
    width: '100%',
    paddingBottom: 40,
  },
  primaryButtonWrapper: {
    borderRadius: 28,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  primaryButton: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    marginTop: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 0.5,
  },
});
