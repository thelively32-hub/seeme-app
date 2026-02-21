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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  
  // Animation values
  const contentOpacity = useSharedValue(0);
  const buttonsOpacity = useSharedValue(0);
  const buttonsTranslateY = useSharedValue(30);

  useEffect(() => {
    // Animate content fade in
    contentOpacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
    
    // Animate buttons
    buttonsOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));
    buttonsTranslateY.value = withDelay(400, withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }));
  }, []);

  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
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
      
      <Animated.View style={[styles.imageContainer, animatedContentStyle]}>
        <ImageBackground
          source={require('../assets/images/social-background.png')}
          style={styles.backgroundImage}
          resizeMode="cover"
          imageStyle={styles.imageStyle}
        >
          {/* Gradient overlay at top and bottom */}
          <LinearGradient
            colors={[
              'rgba(13, 4, 21, 0.3)',
              'rgba(13, 4, 21, 0)',
              'rgba(13, 4, 21, 0)',
              'rgba(13, 4, 21, 0.7)',
              'rgba(13, 4, 21, 1)',
            ]}
            style={styles.imageOverlay}
            locations={[0, 0.15, 0.5, 0.75, 1]}
          />
        </ImageBackground>
      </Animated.View>

      {/* Bottom content section */}
      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 20 }]}>
        {/* Taglines */}
        <Animated.View style={[styles.textContainer, animatedContentStyle]}>
          <Text style={styles.headline}>
            Experience social life{'\n'}like never before!
          </Text>
          <Text style={styles.subtitle}>
            Find the hottest spots with live social radar.
          </Text>
        </Animated.View>

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
  imageContainer: {
    flex: 1,
    width: '100%',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  imageStyle: {
    // Position image to show people and logo
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomSection: {
    backgroundColor: '#0d0415',
    paddingHorizontal: 28,
    paddingTop: 0,
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
