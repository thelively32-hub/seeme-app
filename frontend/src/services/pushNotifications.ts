import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import api from './api';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class PushNotificationService {
  private expoPushToken: string | null = null;
  private notificationListener: Notifications.EventSubscription | null = null;
  private responseListener: Notifications.EventSubscription | null = null;

  async initialize(): Promise<void> {
    if (Platform.OS === 'web') return;

    try {
      // Wrap entire initialization in try/catch
      // expo-notifications throws on iOS 26 with New Architecture if APNs
      // is not properly configured or if called too early at startup
      await this.registerForPushNotifications();
    } catch (error) {
      // Non-fatal: app works fine without push notifications
      console.warn('[PushNotifications] Failed to initialize (non-fatal):', error);
    }
  }

  private async registerForPushNotifications(): Promise<void> {
    if (!Device.isDevice) {
      console.log('[PushNotifications] Push notifications require a physical device');
      return;
    }

    // Check/request permissions with error handling
    let permission;
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      permission = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        permission = status;
      }
    } catch (error) {
      console.warn('[PushNotifications] Permission check failed:', error);
      return;
    }

    if (permission !== 'granted') {
      console.log('[PushNotifications] Permission not granted');
      return;
    }

    // Get push token with error handling
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) return;

      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      this.expoPushToken = tokenData.data;

      // Register token with backend
      if (this.expoPushToken) {
        await api.registerPushToken(this.expoPushToken).catch(() => {
          // Non-fatal if backend registration fails
        });
      }
    } catch (error) {
      console.warn('[PushNotifications] Token registration failed (non-fatal):', error);
    }

    // iOS channel setup
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FFD700',
        });
      } catch (error) {
        console.warn('[PushNotifications] Android channel setup failed:', error);
      }
    }
  }

  setupListeners(
    onReceive?: (notification: Notifications.Notification) => void,
    onResponse?: (response: Notifications.NotificationResponse) => void
  ): void {
    try {
      if (onReceive) {
        this.notificationListener = Notifications.addNotificationReceivedListener(onReceive);
      }
      if (onResponse) {
        this.responseListener = Notifications.addNotificationResponseReceivedListener(onResponse);
      }
    } catch (error) {
      console.warn('[PushNotifications] Listener setup failed (non-fatal):', error);
    }
  }

  removeListeners(): void {
    try {
      this.notificationListener?.remove();
      this.responseListener?.remove();
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  async getExpoPushToken(): Promise<string | null> {
    return this.expoPushToken;
  }
}

export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
