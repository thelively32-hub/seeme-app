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

  async initialize(): Promise<string | null> {
    try {
      // Check if it's a physical device
      if (!Device.isDevice) {
        console.log('Push notifications require a physical device');
        return null;
      }

      // Get push token
      const token = await this.registerForPushNotifications();
      
      if (token) {
        this.expoPushToken = token;
        // Save token to backend
        await this.savePushTokenToBackend(token);
      }

      return token;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      return null;
    }
  }

  private async registerForPushNotifications(): Promise<string | null> {
    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permission if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return null;
    }

    // Get Expo push token
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });
      
      console.log('Expo Push Token:', tokenData.data);
      return tokenData.data;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  private async savePushTokenToBackend(token: string): Promise<void> {
    try {
      await api.savePushToken(token);
      console.log('Push token saved to backend');
    } catch (error) {
      console.error('Failed to save push token:', error);
    }
  }

  // Set up listeners for incoming notifications
  setupListeners(
    onNotificationReceived?: (notification: Notifications.Notification) => void,
    onNotificationResponse?: (response: Notifications.NotificationResponse) => void
  ): void {
    // Listener for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      onNotificationReceived?.(notification);
    });

    // Listener for when user taps on notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
      onNotificationResponse?.(response);
      
      // Handle navigation based on notification data
      this.handleNotificationNavigation(response);
    });
  }

  private handleNotificationNavigation(response: Notifications.NotificationResponse): void {
    const data = response.notification.request.content.data;
    
    // Navigate based on notification type
    // This will be handled by the app's navigation
    if (data?.type === 'vibe') {
      // Navigate to vibes tab
    } else if (data?.type === 'chat') {
      // Navigate to specific chat
    } else if (data?.type === 'invitation') {
      // Navigate to invitations
    }
  }

  // Clean up listeners
  removeListeners(): void {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }

  // Get current push token
  getToken(): string | null {
    return this.expoPushToken;
  }

  // Schedule a local notification (for testing)
  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: Record<string, any>,
    seconds: number = 1
  ): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: { seconds },
    });
  }

  // Get badge count
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  // Set badge count
  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  // Clear all notifications
  async clearAllNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
  }
}

export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
