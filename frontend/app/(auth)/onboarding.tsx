import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import COLORS from '../../src/theme/colors';

const { width, height } = Dimensions.get('window');

const ONBOARDING_KEY = 'vibe_me_onboarding_complete';

const slides = [
  {
    id: 1,
    icon: 'radio-outline',
    title: 'Discover who\'s\naround your vibe',
    subtitle: 'See who\'s nearby and what they\'re looking for, right now.',
    gradient: ['rgba(255, 215, 0, 0.15)', 'rgba(255, 215, 0, 0)'],
  },
  {
    id: 2,
    icon: 'location-outline',
    title: 'Check in where\nlife happens',
    subtitle: 'Bars, clubs, restaurants, events. Let others know you\'re there.',
    gradient: ['rgba(123, 46, 255, 0.15)', 'rgba(123, 46, 255, 0)'],
  },
  {
    id: 3,
    icon: 'pulse-outline',
    title: 'Send a Vibe',
    subtitle: 'Express your interest without the awkward approach. One tap, infinite possibilities.',
    gradient: ['rgba(255, 149, 0, 0.15)', 'rgba(255, 149, 0, 0)'],
  },
  {
    id: 4,
    icon: 'people-outline',
    title: 'Meet in\nreal life',
    subtitle: 'No endless chatting. Connect, meet, and make real memories.',
    gradient: ['rgba(76, 201, 240, 0.15)', 'rgba(76, 201, 240, 0)'],
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const completeOnboarding = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/(auth)/login');
  };

  const currentSlide = slides[currentIndex];
  const isLastSlide = currentIndex === slides.length - 1;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={COLORS.gradients.darkBackground}
        style={StyleSheet.absoluteFill}
      />

      {/* Skip Button */}
      <TouchableOpacity
        style={[styles.skipButton, { top: insets.top + 16 }]}
        onPress={handleSkip}
      >
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Content */}
      <View style={[styles.content, { paddingTop: insets.top + 80 }]}>
        {/* Icon with Glow */}
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={currentSlide.gradient}
            style={styles.iconGlow}
          />
          <View style={styles.iconCircle}>
            <Ionicons
              name={currentSlide.icon as any}
              size={48}
              color={COLORS.gold.primary}
            />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>{currentSlide.title}</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>{currentSlide.subtitle}</Text>
      </View>

      {/* Bottom Section */}
      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 24 }]}>
        {/* Pagination Dots */}
        <View style={styles.pagination}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>

        {/* Next Button */}
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={COLORS.gradients.goldButton}
            style={styles.nextButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.nextButtonText}>
              {isLastSlide ? 'Get Started' : 'Continue'}
            </Text>
            {!isLastSlide && (
              <Ionicons name="arrow-forward" size={20} color={COLORS.background.primary} />
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    right: 24,
    zIndex: 10,
  },
  skipText: {
    fontSize: 15,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
  },
  iconGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.glass.background,
    borderWidth: 1,
    borderColor: COLORS.border.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.text.primary,
    textAlign: 'center',
    lineHeight: 44,
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  bottomSection: {
    paddingHorizontal: 24,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.text.muted,
  },
  dotActive: {
    width: 24,
    backgroundColor: COLORS.gold.primary,
  },
  nextButton: {
    borderRadius: 28,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.gold.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
    }),
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.background.primary,
  },
});
