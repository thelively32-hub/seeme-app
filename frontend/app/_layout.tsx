import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform } from 'react-native';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { LanguageProvider } from '../src/i18n';
import { TourProvider } from '../src/context/TourContext';
import pushNotificationService from '../src/services/pushNotifications';

// Component to initialize push notifications after auth
function PushNotificationInitializer() {
  const { user } = useAuth();

  useEffect(() => {
    if (user && Platform.OS !== 'web') {
      // Initialize push notifications
      pushNotificationService.initialize();
      
      // Set up listeners
      pushNotificationService.setupListeners(
        (notification) => {
          console.log('Notification received in foreground:', notification);
        },
        (response) => {
          console.log('User tapped notification:', response);
        }
      );

      return () => {
        pushNotificationService.removeListeners();
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
            <PushNotificationInitializer />
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
