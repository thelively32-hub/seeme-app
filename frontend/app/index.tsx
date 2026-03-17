import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  
  // Animation values
  const imageOpacity = useSharedValue(0);
  const imageScale = useSharedValue(1.1);
  const buttonsOpacity = useSharedValue(0);
  const buttonsTranslateY = useSharedValue(30);

  useEffect(() => {
    // Animate image
    imageOpacity.value = withTiming(1, { duration: 1000, easing: Easing.out(Easing.cubic) });
    imageScale.value = withTiming(1, { duration: 1500, easing: Easing.out(Easing.cubic) });
    
    // Animate buttons
    buttonsOpacity.value = withDelay(600, withTiming(1, { duration: 600 }));
    buttonsTranslateY.value = withDelay(600, withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }));
  }, []);

  const animatedImageStyle = useAnimatedStyle(() => ({
    opacity: imageOpacity.value,
    transform: [{ scale: imageScale.value }],
  }));

  const animatedButtonsStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
    transform: [{ translateY: buttonsTranslateY.value }],
  }));

  const handleSignUp = () => {
    router.push('/(auth)/signup');
  };

  const handleLogin = () => {
    router.push('/(auth)/login');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Background gradient */}
      <LinearGradient
        colors={['#1a0a2e', '#0d0415', '#0d0415']}
        style={styles.backgroundGradient}
      />

      {/* Main image with people and logo */}
      <Animated.View style={[styles.imageContainer, animatedImageStyle]}>
        <Image
          source={require('../assets/images/social-background.png')}
          style={styles.mainImage}
          resizeMode="contain"
        />
        {/* Bottom fade gradient */}
        <LinearGradient
          colors={['transparent', 'rgba(13, 4, 21, 0.8)', '#0d0415']}
          style={styles.imageFade}
          locations={[0, 0.6, 1]}
        />
      </Animated.View>

      {/* Bottom content section */}
      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 16 }]}>
        {/* Taglines */}
        <View style={styles.textContainer}>
          <Text style={styles.headline}>
            Discover social vibes{'\n'}where people connect
          </Text>
          <Text style={styles.subtitle}>
            Real-time social energy radar for bars & clubs
          </Text>
        </View>

        {/* Buttons Section */}
        <Animated.View style={[styles.buttonsContainer, animatedButtonsStyle]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0415',
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  imageContainer: {
    width: '100%',
    height: height * 0.55,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mainImage: {
    width: width * 1.2,
    height: '100%',
  },
  imageFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  bottomSection: {
    flex: 1,
    backgroundColor: '#0d0415',
    paddingHorizontal: 28,
    justifyContent: 'flex-end',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headline: {
    fontSize: 24,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.55)',
    textAlign: 'center',
    marginTop: 10,
    letterSpacing: 0.2,
  },
  buttonsContainer: {
    width: '100%',
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
