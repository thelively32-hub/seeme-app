/**
 * LinearGradient shim for iOS 26 compatibility.
 * expo-linear-gradient uses CoreGraphics shading which crashes on iOS 26 beta.
 * This shim renders a plain View with the first color as background.
 * Visual difference is minimal since gradients are mostly overlays.
 */
import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';

interface LinearGradientProps {
  colors: string[];
  style?: StyleProp<ViewStyle>;
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  locations?: number[];
  children?: React.ReactNode;
  [key: string]: any;
}

export const LinearGradient: React.FC<LinearGradientProps> = ({
  colors,
  style,
  children,
  ...rest
}) => {
  // Use middle color for best visual approximation
  const bgColor = colors[Math.floor(colors.length / 2)] || colors[0] || 'transparent';
  return (
    <View style={[style, { backgroundColor: bgColor }]} {...rest}>
      {children}
    </View>
  );
};

export default LinearGradient;
