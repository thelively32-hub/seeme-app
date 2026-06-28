/**
 * Push Notifications - temporarily stubbed out for iOS 26 compatibility testing
 * expo-notifications is being tested as a potential cause of TurboModule crash
 */
import { Platform } from 'react-native';

class PushNotificationService {
  async initialize(): Promise<void> {
    // Stubbed - expo-notifications temporarily removed
    console.log('[PushNotifications] Stubbed for iOS 26 testing');
  }

  setupListeners(
    onReceive?: (notification: any) => void,
    onResponse?: (response: any) => void
  ): void {
    // Stubbed
  }

  removeListeners(): void {
    // Stubbed
  }

  async getExpoPushToken(): Promise<string | null> {
    return null;
  }
}

export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
