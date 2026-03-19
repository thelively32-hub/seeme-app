import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import COLORS from '../theme/colors';
import { VibeType } from '../constants/vibes';

interface PremiumVibeIconProps {
  vibe: VibeType;
  size?: 'small' | 'medium' | 'large';
  selected?: boolean;
  onPress?: () => void;
  animated?: boolean;
  showLabel?: boolean;
  glowColor?: string;
}

const SIZES = {
  small: { container: 48, emoji: 22, label: 9 },
  medium: { container: 70, emoji: 32, label: 11 },
  large: { container: 90, emoji: 42, label: 13 },
};

export default function PremiumVibeIcon({
  vibe,
  size = 'medium',
  selected = false,
  onPress,
  animated = true,
  showLabel = true,
  glowColor,
}: PremiumVibeIconProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const sizeConfig = SIZES[size];
  const activeGlowColor = glowColor || vibe.color || COLORS.gold.primary;

  useEffect(() => {
    if (animated && selected) {
      // Pulse animation when selected
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.08,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Glow animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 0.8,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scaleAnim.setValue(1);
      glowAnim.setValue(0.3);
    }

    return () => {
      scaleAnim.stopAnimation();
      glowAnim.stopAnimation();
    };
  }, [selected, animated]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      onPress={onPress}
      onPressIn={onPress ? handlePressIn : undefined}
      onPressOut={onPress ? handlePressOut : undefined}
      activeOpacity={1}
      style={styles.wrapper}
    >
      <Animated.View
        style={[
          styles.container,
          {
            width: sizeConfig.container,
            height: sizeConfig.container,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Outer Glow Effect */}
        {selected && (
          <Animated.View
            style={[
              styles.glowOuter,
              {
                width: sizeConfig.container + 16,
                height: sizeConfig.container + 16,
                borderRadius: (sizeConfig.container + 16) / 2,
                backgroundColor: activeGlowColor,
                opacity: glowAnim,
              },
            ]}
          />
        )}

        {/* Main Circle with Gradient */}
        <LinearGradient
          colors={
            selected
              ? [COLORS.gold.primary, COLORS.gold.secondary, '#B8860B']
              : [COLORS.background.card, COLORS.background.tertiary]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.circle,
            {
              width: sizeConfig.container,
              height: sizeConfig.container,
              borderRadius: sizeConfig.container / 2,
            },
          ]}
        >
          {/* Inner Shine Effect */}
          <View
            style={[
              styles.innerShine,
              {
                width: sizeConfig.container - 8,
                height: sizeConfig.container - 8,
                borderRadius: (sizeConfig.container - 8) / 2,
              },
            ]}
          />

          {/* Emoji */}
          <Text style={[styles.emoji, { fontSize: sizeConfig.emoji }]}>
            {vibe.icon}
          </Text>
        </LinearGradient>

        {/* Selection Ring */}
        {selected && (
          <View
            style={[
              styles.selectionRing,
              {
                width: sizeConfig.container + 6,
                height: sizeConfig.container + 6,
                borderRadius: (sizeConfig.container + 6) / 2,
                borderColor: COLORS.gold.primary,
              },
            ]}
          />
        )}
      </Animated.View>

      {/* Label */}
      {showLabel && (
        <Text
          style={[
            styles.label,
            { fontSize: sizeConfig.label },
            selected && styles.labelSelected,
          ]}
          numberOfLines={1}
        >
          {vibe.labelEs}
        </Text>
      )}
    </Container>
  );
}

// Premium Vibe Grid for Selection
export function PremiumVibeGrid({
  vibes,
  selectedId,
  onSelect,
  columns = 4,
}: {
  vibes: VibeType[];
  selectedId?: string | null;
  onSelect: (vibe: VibeType) => void;
  columns?: number;
}) {
  return (
    <View style={[styles.grid, { gap: 12 }]}>
      {vibes.map((vibe) => (
        <View key={vibe.id} style={{ width: `${100 / columns - 3}%` }}>
          <PremiumVibeIcon
            vibe={vibe}
            size="medium"
            selected={selectedId === vibe.id}
            onPress={() => onSelect(vibe)}
          />
        </View>
      ))}
    </View>
  );
}

// Large Featured Vibe Display
export function FeaturedVibeDisplay({
  vibe,
  message,
}: {
  vibe: VibeType;
  message?: string;
}) {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.featuredContainer}>
      <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
        <PremiumVibeIcon vibe={vibe} size="large" selected animated showLabel={false} />
      </Animated.View>
      <LinearGradient
        colors={['transparent', `${vibe.color}30`, 'transparent']}
        style={styles.featuredGlow}
      />
      <Text style={styles.featuredLabel}>{vibe.labelEs}</Text>
      {message && <Text style={styles.featuredMessage}>"{message}"</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowOuter: {
    position: 'absolute',
    top: -8,
    left: -8,
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.gold.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  innerShine: {
    position: 'absolute',
    top: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  emoji: {
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  selectionRing: {
    position: 'absolute',
    borderWidth: 2,
    borderStyle: 'solid',
  },
  label: {
    marginTop: 6,
    color: COLORS.text.secondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  labelSelected: {
    color: COLORS.gold.primary,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  featuredContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  featuredGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    top: -20,
  },
  featuredLabel: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginTop: 16,
  },
  featuredMessage: {
    fontSize: 16,
    fontStyle: 'italic',
    color: COLORS.text.secondary,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
