import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import COLORS from '../theme/colors';

interface VibeScoreProps {
  score: number; // 0-100
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

export const VibeScore: React.FC<VibeScoreProps> = ({
  score,
  size = 'medium',
  showLabel = true,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  
  const sizeConfig = {
    small: { container: 80, stroke: 6, fontSize: 24, labelSize: 10 },
    medium: { container: 120, stroke: 8, fontSize: 36, labelSize: 12 },
    large: { container: 160, stroke: 10, fontSize: 48, labelSize: 14 },
  };
  
  const config = sizeConfig[size];
  const radius = (config.container - config.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: score,
      duration: 1500,
      useNativeDriver: false,
    }).start();
  }, [score]);

  const getScoreColor = () => {
    if (score >= 80) return COLORS.gold.primary;
    if (score >= 60) return COLORS.energy.hot;
    if (score >= 40) return COLORS.energy.medium;
    return COLORS.energy.low;
  };

  const animatedScore = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [0, score],
  });

  return (
    <View style={[styles.container, { width: config.container, height: config.container }]}>
      {/* Background Circle */}
      <Svg
        width={config.container}
        height={config.container}
        style={styles.svg}
      >
        <Defs>
          <SvgGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={COLORS.gold.bright} />
            <Stop offset="100%" stopColor={COLORS.gold.primary} />
          </SvgGradient>
        </Defs>
        
        {/* Background track */}
        <Circle
          cx={config.container / 2}
          cy={config.container / 2}
          r={radius}
          stroke={COLORS.glass.background}
          strokeWidth={config.stroke}
          fill="transparent"
        />
        
        {/* Progress */}
        <Circle
          cx={config.container / 2}
          cy={config.container / 2}
          r={radius}
          stroke="url(#scoreGradient)"
          strokeWidth={config.stroke}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${config.container / 2} ${config.container / 2})`}
        />
      </Svg>

      {/* Score Display */}
      <View style={styles.scoreContainer}>
        <Text style={[styles.score, { fontSize: config.fontSize, color: getScoreColor() }]}>
          {score}
        </Text>
        {showLabel && (
          <Text style={[styles.label, { fontSize: config.labelSize }]}>
            VIBE SCORE
          </Text>
        )}
      </View>

      {/* Glow Effect */}
      <View
        style={[
          styles.glow,
          {
            width: config.container,
            height: config.container,
            borderRadius: config.container / 2,
            backgroundColor: `${getScoreColor()}10`,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  svg: {
    position: 'absolute',
  },
  scoreContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: {
    fontWeight: '700',
    letterSpacing: -1,
  },
  label: {
    color: COLORS.text.muted,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 2,
  },
  glow: {
    position: 'absolute',
    zIndex: -1,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.gold.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
    }),
  },
});

export default VibeScore;
