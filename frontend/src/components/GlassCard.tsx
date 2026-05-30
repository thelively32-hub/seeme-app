import React from 'react';
import { View, StyleSheet, Platform, ViewStyle } from 'react-native';
import COLORS from '../theme/colors';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
  borderRadius?: number;
  withBorder?: boolean;
  withGlow?: boolean;
  glowColor?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  padding = 16,
  borderRadius = 24,
  withBorder = true,
  withGlow = false,
  glowColor = COLORS.gold.primary,
}) => {
  return (
    <View
      style={[
        styles.card,
        {
          padding,
          borderRadius,
          borderWidth: withBorder ? 1 : 0,
          borderColor: withBorder ? COLORS.glass.border : 'transparent',
        },
        withGlow && {
          ...Platform.select({
            ios: {
              shadowColor: glowColor,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 12,
            },
          }),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.glass.background,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(20px)',
      },
    }),
  },
});

export default GlassCard;
