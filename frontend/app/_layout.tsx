import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform } from 'react-native';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { LanguageProvider } from '../src/i18n';
import { TourProvider } from '../src/context/TourContext';
import pushNotificationService from '../src/services/pushNotifications';
import analyticsService from '../src/services/analytics';

// Component to initialize push notifications and analytics after auth
function AppInitializer() {
  const { user } = useAuth();

  useEffect(() => {
    // Initialize analytics
    analyticsService.initialize();
  }, []);

  useEffect(() => {
    if (user) {
      // Set user ID for analytics
      analyticsService.setUserId(user.id);
      analyticsService.setUserProperties({
        is_premium: user.is_premium ? 'true' : 'false',
      });

      // Initialize push notifications on native
      if (Platform.OS !== 'web') {
        pushNotificationService.initialize();
        
        pushNotificationService.setupListeners(
          (notification) => {
            console.log('Notification received in foreground:', notification);
          },
          (response) => {
            console.log('User tapped notification:', response);
          }
        );
      }

      return () => {
        if (Platform.OS !== 'web') {
          pushNotificationService.removeListeners();
        }
      };
    }
  }, [user]);

  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LanguageProvider>
        <AuthProvider>
          <TourProvider>
            <AppInitializer />
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#0d0415' },
                animation: 'fade',
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="settings" />
              <Stack.Screen name="legal" />
            </Stack>
          </TourProvider>
        </AuthProvider>
      </LanguageProvider>
    </GestureHandlerRootView>
  );
}
