import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import COLORS from '../theme/colors';

type EnergyLevel = 'low' | 'medium' | 'hot' | 'trending';

interface EnergyBadgeProps {
  level: EnergyLevel;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

const getLevelConfig = (level: EnergyLevel) => {
  switch (level) {
    case 'trending':
      return {
        color: COLORS.energy.trending,
        label: 'TRENDING',
        emoji: '🔥',
        gradient: ['#FF3B30', '#FF6B5B'],
        glow: 'rgba(255, 59, 48, 0.4)',
      };
    case 'hot':
      return {
        color: COLORS.energy.hot,
        label: 'HOT',
        emoji: '🟠',
        gradient: ['#FF9500', '#FFB340'],
        glow: 'rgba(255, 149, 0, 0.4)',
      };
    case 'medium':
      return {
        color: COLORS.energy.medium,
        label: 'MEDIUM',
        emoji: '🟡',
        gradient: ['#FFD700', '#FFE55C'],
        glow: 'rgba(255, 215, 0, 0.4)',
      };
    case 'low':
    default:
      return {
        color: COLORS.energy.low,
        label: 'LOW',
        emoji: '🟢',
        gradient: ['#34C759', '#5DD879'],
        glow: 'rgba(52, 199, 89, 0.4)',
      };
  }
};

export const EnergyBadge: React.FC<EnergyBadgeProps> = ({ 
  level, 
  size = 'medium',
  showLabel = true 
}) => {
  const config = getLevelConfig(level);
  
  const sizeStyles = {
    small: { paddingH: 8, paddingV: 4, fontSize: 10, dotSize: 6 },
    medium: { paddingH: 12, paddingV: 6, fontSize: 11, dotSize: 8 },
    large: { paddingH: 16, paddingV: 8, fontSize: 12, dotSize: 10 },
  };
  
  const s = sizeStyles[size];

  return (
    <View style={[
      styles.badge,
      { 
        backgroundColor: `${config.color}15`,
        paddingHorizontal: s.paddingH,
        paddingVertical: s.paddingV,
      }
    ]}>
      <View style={[
        styles.dot,
        { 
          width: s.dotSize, 
          height: s.dotSize, 
          backgroundColor: config.color,
          ...Platform.select({
            ios: {
              shadowColor: config.color,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.8,
              shadowRadius: 4,
            },
          }),
        }
      ]} />
      {showLabel && (
        <Text style={[styles.label, { color: config.color, fontSize: s.fontSize }]}>
          {config.label}
        </Text>
      )}
    </View>
  );
};

interface EnergyBarProps {
  level: EnergyLevel;
  animated?: boolean;
}

export const EnergyBar: React.FC<EnergyBarProps> = ({ level, animated = false }) => {
  const config = getLevelConfig(level);
  
  const getWidth = () => {
    switch (level) {
      case 'trending': return '100%';
      case 'hot': return '75%';
      case 'medium': return '50%';
      case 'low': return '25%';
    }
  };

  return (
    <View style={styles.barContainer}>
      <View style={styles.barBackground}>
        <LinearGradient
          colors={config.gradient as [string, string]}
          style={[styles.barFill, { width: getWidth() }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
      </View>
      <Text style={[styles.barLabel, { color: config.color }]}>
        {config.emoji} {config.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    gap: 6,
  },
  dot: {
    borderRadius: 50,
  },
  label: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  barBackground: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.glass.background,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
  barLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default EnergyBadge;
