import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';

const { width, height } = Dimensions.get('window');

// Simulated map pins data
const mapPins = [
  { x: 0.15, y: 0.25, color: '#ff5533', size: 14, delay: 0 },      // Trending
  { x: 0.75, y: 0.18, color: '#ff9800', size: 12, delay: 200 },    // High
  { x: 0.35, y: 0.35, color: '#ffc107', size: 10, delay: 400 },    // Medium
  { x: 0.85, y: 0.38, color: '#4caf50', size: 8, delay: 600 },     // Low
  { x: 0.25, y: 0.55, color: '#ff5533', size: 16, delay: 100 },    // Trending (larger)
  { x: 0.65, y: 0.45, color: '#ff9800', size: 11, delay: 300 },    // High
  { x: 0.45, y: 0.22, color: '#ffc107', size: 9, delay: 500 },     // Medium
  { x: 0.55, y: 0.58, color: '#4caf50', size: 10, delay: 700 },    // Low
  { x: 0.08, y: 0.42, color: '#ff5533', size: 12, delay: 150 },    // Trending
  { x: 0.92, y: 0.28, color: '#ff9800', size: 13, delay: 350 },    // High
];

// Animated Pin Component
const AnimatedPin = ({ 
  x, 
  y, 
  color, 
  size, 
  delay 
}: { 
  x: number; 
  y: number; 
  color: string; 
  size: number; 
  delay: number;
}) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 800,
      delay,
      useNativeDriver: true,
    }).start();

    // Pulse animation for trending (red) pins
    if (color === '#ff5533') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            delay: delay + 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, []);

  const scale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.3],
  });

  const glowOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.pin,
        {
          left: `${x * 100}%`,
          top: `${y * 100}%`,
          opacity: opacityAnim,
          transform: [{ scale: color === '#ff5533' ? scale : 1 }],
        },
      ]}
    >
      {/* Glow effect for trending */}
      {color === '#ff5533' && (
        <Animated.View
          style={[
            styles.pinGlow,
            {
              width: size * 3,
              height: size * 3,
              borderRadius: size * 1.5,
              backgroundColor: color,
              opacity: glowOpacity,
            },
          ]}
        />
      )}
      <View
        style={[
          styles.pinDot,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
        ]}
      />
    </Animated.View>
  );
};

// Background light orbs
const LightOrb = ({ 
  x, 
  y, 
  size, 
  color, 
  delay 
}: { 
  x: number; 
  y: number; 
  size: number; 
  color: string;
  delay: number;
}) => {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 4000 + delay,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 4000 + delay,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  return (
    <Animated.View
      style={[
        styles.lightOrb,
        {
          left: `${x * 100}%`,
          top: `${y * 100}%`,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          transform: [{ translateY }],
        },
      ]}
    />
  );
};

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isLoading } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Animate content in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        delay: 300,
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

  const handleStartExploring = () => {
    router.push('/(auth)/signup');
  };

  const handleLogin = () => {
    router.push('/(auth)/login');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient colors={['#0d0415', '#1a0a2e']} style={StyleSheet.absoluteFill} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={['#0d0415', '#1a0a2e', '#0d0415']}
        style={StyleSheet.absoluteFill}
        locations={[0, 0.5, 1]}
      />

      {/* Ambient light orbs */}
      <View style={styles.orbsContainer}>
        <LightOrb x={0.1} y={0.15} size={200} color="rgba(255, 123, 53, 0.08)" delay={0} />
        <LightOrb x={0.7} y={0.25} size={180} color="rgba(236, 64, 122, 0.06)" delay={500} />
        <LightOrb x={0.3} y={0.6} size={220} color="rgba(255, 123, 53, 0.05)" delay={1000} />
        <LightOrb x={0.8} y={0.7} size={160} color="rgba(156, 39, 176, 0.06)" delay={1500} />
      </View>

      {/* Simulated Map with pins */}
      <View style={styles.mapContainer}>
        {/* Map grid lines (subtle) */}
        <View style={styles.mapGrid}>
          {[...Array(6)].map((_, i) => (
            <View key={`h${i}`} style={[styles.gridLine, styles.gridLineH, { top: `${(i + 1) * 15}%` }]} />
          ))}
          {[...Array(6)].map((_, i) => (
            <View key={`v${i}`} style={[styles.gridLine, styles.gridLineV, { left: `${(i + 1) * 15}%` }]} />
          ))}
        </View>

        {/* Animated pins */}
        {mapPins.map((pin, index) => (
          <AnimatedPin key={index} {...pin} />
        ))}

        {/* Blur overlay at bottom */}
        <LinearGradient
          colors={['transparent', 'rgba(13, 4, 21, 0.8)', '#0d0415']}
          style={styles.mapFade}
          locations={[0, 0.5, 1]}
        />
      </View>

      {/* Content */}
      <Animated.View
        style={[
          styles.content,
          {
            paddingBottom: insets.bottom + 20,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Ionicons name="eye" size={28} color="#ff7b35" />
          </View>
          <Text style={styles.logoText}>SEE ME</Text>
        </View>

        {/* Hero copy */}
        <Text style={styles.headline}>
          See where the{'\n'}vibe is happening
        </Text>
        <Text style={styles.subtitle}>
          Live social radar for bars & clubs
        </Text>

        {/* CTA Buttons */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleStartExploring}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#ff7b35', '#ec407a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryButtonGradient}
          >
            <Text style={styles.primaryButtonText}>Start exploring</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleLogin}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>Log in</Text>
        </TouchableOpacity>

        {/* Micro copy */}
        <Text style={styles.microCopy}>
          No pressure. Just real social vibes.
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0415',
  },
  loadingContainer: {
    flex: 1,
  },
  orbsContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  lightOrb: {
    position: 'absolute',
    opacity: 1,
  },
  mapContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.55,
    overflow: 'hidden',
  },
  mapGrid: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 123, 53, 0.03)',
  },
  gridLineH: {
    left: 0,
    right: 0,
    height: 1,
  },
  gridLineV: {
    top: 0,
    bottom: 0,
    width: 1,
  },
  mapFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  pin: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinGlow: {
    position: 'absolute',
  },
  pinDot: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 10,
  },
  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 123, 53, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 123, 53, 0.3)',
  },
  logoText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 2,
  },
  headline: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 44,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 17,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginBottom: 36,
  },
  primaryButton: {
    marginBottom: 16,
    borderRadius: 28,
    overflow: 'hidden',
    // Glow effect
    shadowColor: '#ff7b35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    gap: 10,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 24,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  microCopy: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    marginBottom: 10,
  },
});
