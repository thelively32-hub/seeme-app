import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Defs, RadialGradient, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

// SEE ME Logo - Smaller, more stylized eye with orange/magenta gradient
const SeeMeLogo = ({ size = 100 }: { size?: number }) => {
  const pulseValue = useSharedValue(1);
  const glowOpacity = useSharedValue(0.4);

  useEffect(() => {
    pulseValue.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 1800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseValue.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View style={{ alignItems: 'center' }}>
      {/* Subtle glow behind logo */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: size * 1.3,
            height: size * 0.8,
            borderRadius: size * 0.4,
            backgroundColor: '#ff6b35',
            top: size * 0.1,
          },
          glowStyle,
        ]}
      />
      <Animated.View style={animatedStyle}>
        <Svg width={size} height={size * 0.65} viewBox="0 0 200 130">
          <Defs>
            {/* Main gradient - orange to pink/magenta */}
            <SvgLinearGradient id="eyeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#ffaa40" />
              <Stop offset="30%" stopColor="#ff7b35" />
              <Stop offset="60%" stopColor="#ff5580" />
              <Stop offset="100%" stopColor="#d63384" />
            </SvgLinearGradient>
            
            {/* Inner dark gradient */}
            <RadialGradient id="innerDarkGradient" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#1a0a2e" />
              <Stop offset="100%" stopColor="#0d0415" />
            </RadialGradient>
            
            {/* Yellow/orange accent */}
            <SvgLinearGradient id="accentGradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#ffc107" />
              <Stop offset="100%" stopColor="#ff8c00" />
            </SvgLinearGradient>
          </Defs>
          
          {/* Main eye shape - elongated almond */}
          <Path
            d="M100 15 
               C160 15 195 55 198 65 
               C195 75 160 115 100 115 
               C40 115 5 75 2 65 
               C5 55 40 15 100 15"
            fill="url(#eyeGradient)"
          />
          
          {/* Inner eye outline detail */}
          <Path
            d="M100 25 
               C150 25 180 55 183 65 
               C180 75 150 105 100 105 
               C50 105 20 75 17 65 
               C20 55 50 25 100 25"
            fill="none"
            stroke="#ffb366"
            strokeWidth="2"
            opacity={0.5}
          />
          
          {/* Dark inner circle (iris area) */}
          <Circle cx="100" cy="65" r="35" fill="url(#innerDarkGradient)" />
          
          {/* Inner spiral/swirl - characteristic of the logo */}
          <Path
            d="M100 40 
               Q125 52 112 65 
               Q100 78 88 65 
               Q75 52 100 40"
            fill="none"
            stroke="#ff7b35"
            strokeWidth="4"
            opacity={0.9}
          />
          
          {/* Second spiral layer */}
          <Path
            d="M100 48 
               Q115 56 108 65 
               Q100 74 92 65 
               Q85 56 100 48"
            fill="none"
            stroke="#d63384"
            strokeWidth="3"
            opacity={0.7}
          />
          
          {/* Main highlight - white reflection */}
          <Circle cx="82" cy="50" r="10" fill="#ffffff" opacity={0.95} />
          
          {/* Small secondary highlight */}
          <Circle cx="90" cy="62" r="4" fill="#ffffff" opacity={0.6} />
          
          {/* Bottom accent curve (smile hint) */}
          <Path
            d="M75 100 Q100 112 125 100"
            stroke="url(#accentGradient)"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
            opacity={0.8}
          />
        </Svg>
      </Animated.View>
    </View>
  );
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  
  // Animation values
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(30);
  const buttonsOpacity = useSharedValue(0);
  const buttonsTranslateY = useSharedValue(40);

  useEffect(() => {
    // Animate content
    contentOpacity.value = withDelay(200, withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) }));
    contentTranslateY.value = withDelay(200, withTiming(0, { duration: 800, easing: Easing.out(Easing.cubic) }));
    
    // Animate buttons
    buttonsOpacity.value = withDelay(500, withTiming(1, { duration: 600 }));
    buttonsTranslateY.value = withDelay(500, withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }));
  }, []);

  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const animatedButtonsStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
    transform: [{ translateY: buttonsTranslateY.value }],
  }));

  const handleSignUp = () => {
    console.log('Sign Up pressed');
  };

  const handleLogin = () => {
    console.log('Log In pressed');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <ImageBackground
        source={require('../assets/images/social-background.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Dark overlay gradient for better text readability */}
        <LinearGradient
          colors={[
            'rgba(26, 10, 46, 0.3)',
            'rgba(13, 4, 21, 0.5)',
            'rgba(13, 4, 21, 0.85)',
            'rgba(13, 4, 21, 0.95)',
          ]}
          style={styles.overlay}
          locations={[0, 0.4, 0.7, 1]}
        >
          <View style={[styles.content, { paddingTop: insets.top + 20 }]}>
            {/* Spacer to push content down */}
            <View style={styles.topSpacer} />
            
            {/* Logo and Brand Section - Centered */}
            <Animated.View style={[styles.brandSection, animatedContentStyle]}>
              <SeeMeLogo size={120} />
              
              <Text style={styles.brandName}>SEE ME</Text>
              
              <Text style={styles.headline}>
                Experience social life{'\n'}like never before!
              </Text>
              
              <Text style={styles.subtitle}>
                Find the hottest spots with live social radar.
              </Text>
            </Animated.View>

            {/* Spacer */}
            <View style={styles.spacer} />

            {/* Buttons Section */}
            <Animated.View style={[styles.buttonsContainer, animatedButtonsStyle, { paddingBottom: insets.bottom + 20 }]}>
              {/* Primary Button - Sign Up */}
              <TouchableOpacity
                style={styles.primaryButtonWrapper}
                onPress={handleSignUp}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['#ffaa40', '#ff7b35', '#ff5533']}
                  style={styles.primaryButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.primaryButtonText}>Sign Up</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Secondary Button - Log In */}
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleLogin}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryButtonText}>Log In</Text>
              </TouchableOpacity>

              {/* Terms text */}
              <Text style={styles.termsText}>
                By continuing, you agree to our{' '}
                <Text style={styles.termsLink}>Terms of Service</Text>
                {' '}and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </Animated.View>
          </View>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0415',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
  },
  topSpacer: {
    flex: 0.15,
  },
  brandSection: {
    alignItems: 'center',
  },
  brandName: {
    fontSize: 42,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 3,
    marginTop: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  headline: {
    fontSize: 22,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 30,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginTop: 12,
    letterSpacing: 0.2,
  },
  spacer: {
    flex: 1,
  },
  buttonsContainer: {
    width: '100%',
    paddingBottom: 30,
  },
  primaryButtonWrapper: {
    borderRadius: 30,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#ff7b35',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
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
    borderRadius: 30,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    marginTop: 14,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(147, 51, 234, 0.7)',
    backgroundColor: 'rgba(88, 28, 135, 0.35)',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  termsText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.45)',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 16,
  },
  termsLink: {
    color: 'rgba(255, 140, 66, 0.8)',
    textDecorationLine: 'underline',
  },
});
