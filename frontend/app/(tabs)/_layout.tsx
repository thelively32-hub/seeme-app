import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import COLORS from '../../src/theme/colors';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(5, 5, 5, 0.95)',
          borderTopColor: COLORS.border.light,
          borderTopWidth: 1,
          height: 70 + insets.bottom,
          paddingBottom: insets.bottom + 8,
          paddingTop: 12,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.15,
              shadowRadius: 8,
            },
          }),
        },
        tabBarActiveTintColor: COLORS.gold.primary,
        tabBarInactiveTintColor: COLORS.text.muted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 4,
          letterSpacing: 0.3,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Radar',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
                <Ionicons 
                  name="radio-outline"
                  size={22} 
                  color={color} 
                />
              </View>
              {focused && <View style={styles.glowDot} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="vibes"
        options={{
          title: 'Vibes',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
                <Ionicons 
                  name={focused ? 'pulse' : 'pulse-outline'} 
                  size={22} 
                  color={color} 
                />
              </View>
              {focused && <View style={styles.glowDot} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: '',
          tabBarIcon: ({ focused }) => (
            <View style={styles.centerButtonContainer}>
              <LinearGradient
                colors={COLORS.gradients.goldButton as [string, string, string]}
                style={styles.centerButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons 
                  name="locate" 
                  size={26} 
                  color={COLORS.background.primary} 
                />
              </LinearGradient>
              {focused && <View style={styles.centerGlow} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="invitations"
        options={{
          title: 'Plans',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
                <Ionicons 
                  name={focused ? 'calendar' : 'calendar-outline'} 
                  size={22} 
                  color={color} 
                />
              </View>
              {focused && <View style={styles.glowDot} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconContainer}>
              <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
                <Ionicons 
                  name={focused ? 'person' : 'person-outline'} 
                  size={22} 
                  color={color} 
                />
              </View>
              {focused && <View style={styles.glowDot} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="radar"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 32,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 32,
    borderRadius: 12,
  },
  iconWrapperActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  glowDot: {
    position: 'absolute',
    bottom: -8,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.gold.primary,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.gold.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 4,
      },
    }),
  },
  centerButtonContainer: {
    marginBottom: 28,
    alignItems: 'center',
  },
  centerButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.background.primary,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.gold.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  centerGlow: {
    position: 'absolute',
    bottom: -4,
    width: 20,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.gold.primary,
    opacity: 0.6,
  },
});
