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
import Svg, { Path, Circle, Defs, RadialGradient, Stop, G, Ellipse } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

// Animated Bokeh/Glow particle component
const BokehParticle = ({ 
  size, 
  color, 
  x, 
  y, 
  delay 
}: { 
  size: number; 
  color: string; 
  x: number; 
  y: number; 
  delay: number;
}) => {
  const opacity = useSharedValue(0.2);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.6, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.2, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.2, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.8, { duration: 3000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x,
          top: y,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
};

// SEE ME Logo - Vibrant eye with orange/magenta gradient and smile
const SeeMeLogo = ({ size = 160 }: { size?: number }) => {
  const pulseValue = useSharedValue(1);
  const glowOpacity = useSharedValue(0.5);

  useEffect(() => {
    pulseValue.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 1500, easing: Easing.inOut(Easing.ease) })
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
      {/* Glow effect behind logo */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: size * 1.5,
            height: size * 1.5,
            borderRadius: size * 0.75,
            backgroundColor: '#ff6b35',
            top: -size * 0.25,
          },
          glowStyle,
        ]}
      />
      <Animated.View style={animatedStyle}>
        <Svg width={size} height={size} viewBox="0 0 200 200">
          <Defs>
            {/* Main eye gradient - orange to magenta */}
            <RadialGradient id="eyeMainGradient" cx="30%" cy="30%" r="70%">
              <Stop offset="0%" stopColor="#ff8c42" />
              <Stop offset="50%" stopColor="#ff6b35" />
              <Stop offset="100%" stopColor="#d63384" />
            </RadialGradient>
            
            {/* Inner eye gradient */}
            <RadialGradient id="innerEyeGradient" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#1a0a2e" />
              <Stop offset="100%" stopColor="#0d0415" />
            </RadialGradient>
            
            {/* Highlight gradient */}
            <RadialGradient id="highlightGradient" cx="30%" cy="30%" r="50%">
              <Stop offset="0%" stopColor="#ffffff" />
              <Stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          
          {/* Outer eye shape - stylized almond */}
          <Path
            d="M100 40 
               C150 40 185 75 190 100 
               C185 125 150 160 100 160 
               C50 160 15 125 10 100 
               C15 75 50 40 100 40"
            fill="url(#eyeMainGradient)"
          />
          
          {/* Inner curve detail - left */}
          <Path
            d="M100 50 
               C140 50 170 80 175 100 
               C170 120 140 150 100 150 
               C60 150 30 120 25 100 
               C30 80 60 50 100 50"
            fill="none"
            stroke="#ff9f5a"
            strokeWidth="2"
            opacity={0.6}
          />
          
          {/* Inner dark circle (iris area) */}
          <Circle cx="100" cy="100" r="45" fill="url(#innerEyeGradient)" />
          
          {/* Spiral/swirl inside eye */}
          <Path
            d="M100 70 
               Q130 85 115 100 
               Q100 115 85 100 
               Q70 85 100 70"
            fill="none"
            stroke="#ff6b35"
            strokeWidth="4"
            opacity={0.8}
          />
          
          {/* Inner spiral continue */}
          <Path
            d="M100 80 
               Q115 90 108 100 
               Q100 110 92 100 
               Q85 90 100 80"
            fill="none"
            stroke="#d63384"
            strokeWidth="3"
            opacity={0.6}
          />
          
          {/* Main highlight - white reflection */}
          <Circle cx="75" cy="75" r="12" fill="#ffffff" opacity={0.95} />
          
          {/* Secondary smaller highlight */}
          <Circle cx="85" cy="90" r="5" fill="#ffffff" opacity={0.5} />
          
          {/* Smile curve below the eye */}
          <Path
            d="M60 170 Q100 195 140 170"
            stroke="url(#eyeMainGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      </Animated.View>
    </View>
  );
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  
  // Animation values
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.5);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(30);
  const buttonsOpacity = useSharedValue(0);
  const buttonsTranslateY = useSharedValue(40);

  useEffect(() => {
    // Animate logo
    logoOpacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
    logoScale.value = withTiming(1, { duration: 1000, easing: Easing.out(Easing.back) });
    
    // Animate text
    textOpacity.value = withDelay(400, withTiming(1, { duration: 700 }));
    textTranslateY.value = withDelay(400, withTiming(0, { duration: 700, easing: Easing.out(Easing.cubic) }));
    
    // Animate buttons
    buttonsOpacity.value = withDelay(700, withTiming(1, { duration: 600 }));
    buttonsTranslateY.value = withDelay(700, withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }));
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

  const handleSignUp = () => {
    console.log('Sign Up pressed');
  };

  const handleLogin = () => {
    console.log('Log In pressed');
  };

  // Bokeh particles configuration
  const bokehParticles = [
    { size: 80, color: 'rgba(214, 51, 132, 0.3)', x: -20, y: 60, delay: 0 },
    { size: 120, color: 'rgba(255, 107, 53, 0.2)', x: width - 80, y: 100, delay: 500 },
    { size: 60, color: 'rgba(168, 85, 247, 0.35)', x: 40, y: height * 0.3, delay: 1000 },
    { size: 100, color: 'rgba(236, 72, 153, 0.25)', x: width - 60, y: height * 0.4, delay: 300 },
    { size: 50, color: 'rgba(255, 140, 66, 0.3)', x: 20, y: height * 0.55, delay: 800 },
    { size: 70, color: 'rgba(147, 51, 234, 0.3)', x: width - 100, y: height * 0.65, delay: 200 },
    { size: 40, color: 'rgba(236, 72, 153, 0.4)', x: width * 0.3, y: 40, delay: 600 },
    { size: 55, color: 'rgba(255, 107, 53, 0.25)', x: width * 0.6, y: height * 0.75, delay: 400 },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <LinearGradient
        colors={['#1a0a2e', '#120820', '#0d0415', '#1a0a2e']}
        style={styles.gradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        locations={[0, 0.3, 0.7, 1]}
      >
        {/* Bokeh/Glow particles */}
        {bokehParticles.map((particle, index) => (
          <BokehParticle
            key={index}
            size={particle.size}
            color={particle.color}
            x={particle.x}
            y={particle.y}
            delay={particle.delay}
          />
        ))}

        <View style={[styles.content, { paddingTop: insets.top + 40 }]}>
          {/* Logo Section */}
          <Animated.View style={[styles.logoContainer, animatedLogoStyle]}>
            <SeeMeLogo size={150} />
          </Animated.View>

          {/* Brand Name with glow effect */}
          <Animated.View style={[styles.brandContainer, animatedTextStyle]}>
            <Text style={styles.brandName}>SEE ME</Text>
            {/* Glow text layer */}
            <Text style={[styles.brandName, styles.brandNameGlow]}>SEE ME</Text>
          </Animated.View>

          {/* Taglines */}
          <Animated.View style={[styles.textContainer, animatedTextStyle]}>
            <Text style={styles.headline}>Experience social life</Text>
            <Text style={styles.headline}>like never before!</Text>
            <Text style={styles.subtitle}>Find the hottest spots with live social radar.</Text>
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
                colors={['#ff8c42', '#ff6b35', '#e85d04']}
                style={styles.primaryButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
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
              <LinearGradient
                colors={['rgba(147, 51, 234, 0.3)', 'rgba(168, 85, 247, 0.2)']}
                style={styles.secondaryButtonInner}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.secondaryButtonText}>Log In</Text>
              </LinearGradient>
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
    paddingHorizontal: 28,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 30,
  },
  brandContainer: {
    alignItems: 'center',
    marginTop: 8,
    position: 'relative',
  },
  brandName: {
    fontSize: 48,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 4,
    textShadowColor: 'rgba(255, 107, 53, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  brandNameGlow: {
    position: 'absolute',
    color: 'transparent',
    textShadowColor: 'rgba(236, 72, 153, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 40,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 32,
  },
  headline: {
    fontSize: 24,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.55)',
    textAlign: 'center',
    marginTop: 16,
    letterSpacing: 0.2,
    lineHeight: 22,
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
        shadowColor: '#ff6b35',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
      },
      android: {
        elevation: 15,
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
    letterSpacing: 1,
  },
  secondaryButton: {
    marginTop: 14,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(147, 51, 234, 0.6)',
  },
  secondaryButtonInner: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 1,
  },
  termsText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 16,
  },
  termsLink: {
    color: 'rgba(255, 107, 53, 0.7)',
    textDecorationLine: 'underline',
  },
});
