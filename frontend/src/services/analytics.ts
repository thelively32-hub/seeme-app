import { Platform } from 'react-native';
import { getAnalytics, logEvent, setUserId, setUserProperties, isSupported } from 'firebase/analytics';
import { firebaseApp } from './firebase';

// Analytics events for SEE ME app
export const ANALYTICS_EVENTS = {
  // Auth events
  SIGN_UP: 'sign_up',
  LOGIN: 'login',
  LOGOUT: 'logout',
  
  // Profile events
  PROFILE_COMPLETE: 'profile_complete',
  PROFILE_UPDATE: 'profile_update',
  PHOTO_UPLOAD: 'photo_upload',
  
  // Vibe events
  VIBE_SENT: 'vibe_sent',
  VIBE_RECEIVED: 'vibe_received',
  VIBE_ACCEPTED: 'vibe_accepted',
  VIBE_REJECTED: 'vibe_rejected',
  
  // Chat events
  CHAT_STARTED: 'chat_started',
  MESSAGE_SENT: 'message_sent',
  IMAGE_SENT: 'image_sent',
  
  // Location events
  CHECK_IN: 'check_in',
  CHECK_OUT: 'check_out',
  QR_SCAN: 'qr_scan',
  
  // Subscription events
  SUBSCRIPTION_VIEW: 'subscription_view',
  SUBSCRIPTION_START: 'subscription_start',
  SUBSCRIPTION_CANCEL: 'subscription_cancel',
  
  // Invitation events
  INVITATION_CREATED: 'invitation_created',
  INVITATION_RESPONDED: 'invitation_responded',
  
  // Screen views
  SCREEN_VIEW: 'screen_view',
  
  // Engagement
  APP_OPEN: 'app_open',
  TOUR_COMPLETE: 'tour_complete',
  TOUR_SKIP: 'tour_skip',
};

class AnalyticsService {
  private analytics: any = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Firebase Analytics only works on web with the web SDK
      if (Platform.OS === 'web') {
        const supported = await isSupported();
        if (supported) {
          this.analytics = getAnalytics(firebaseApp);
          this.initialized = true;
          console.log('Firebase Analytics initialized (web)');
        }
      } else {
        // For native, we'll use mock logging
        // Real analytics on native requires development build
        console.log('Analytics: Using mock mode for native');
        this.initialized = true;
      }
    } catch (error) {
      console.log('Analytics not available:', error);
      this.initialized = true; // Still mark as initialized to prevent retries
    }
  }

  async logEvent(eventName: string, params?: Record<string, any>): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      if (this.analytics && Platform.OS === 'web') {
        logEvent(this.analytics, eventName, params);
      } else {
        // Mock logging for development
        console.log(`[Analytics] ${eventName}`, params || '');
      }
    } catch (error) {
      console.error('Analytics event error:', error);
    }
  }

  async logScreenView(screenName: string, screenClass?: string): Promise<void> {
    await this.logEvent('screen_view', {
      screen_name: screenName,
      screen_class: screenClass || screenName,
    });
  }

  async setUserId(userId: string | null): Promise<void> {
    if (this.analytics && Platform.OS === 'web' && userId) {
      try {
        setUserId(this.analytics, userId);
      } catch (error) {
        console.error('Analytics setUserId error:', error);
      }
    }
  }

  async setUserProperties(properties: Record<string, string>): Promise<void> {
    if (this.analytics && Platform.OS === 'web') {
      try {
        setUserProperties(this.analytics, properties);
      } catch (error) {
        console.error('Analytics setUserProperties error:', error);
      }
    }
  }

  // Convenience methods for common events
  async logSignUp(method: string = 'phone'): Promise<void> {
    await this.logEvent(ANALYTICS_EVENTS.SIGN_UP, { method });
  }

  async logLogin(method: string = 'phone'): Promise<void> {
    await this.logEvent(ANALYTICS_EVENTS.LOGIN, { method });
  }

  async logVibeSent(vibeType: string, placeId?: string): Promise<void> {
    await this.logEvent(ANALYTICS_EVENTS.VIBE_SENT, { vibe_type: vibeType, place_id: placeId });
  }

  async logVibeAccepted(vibeType: string): Promise<void> {
    await this.logEvent(ANALYTICS_EVENTS.VIBE_ACCEPTED, { vibe_type: vibeType });
  }

  async logCheckIn(placeId: string, placeName: string): Promise<void> {
    await this.logEvent(ANALYTICS_EVENTS.CHECK_IN, { place_id: placeId, place_name: placeName });
  }

  async logMessageSent(chatId: string, hasImage: boolean = false): Promise<void> {
    await this.logEvent(hasImage ? ANALYTICS_EVENTS.IMAGE_SENT : ANALYTICS_EVENTS.MESSAGE_SENT, { chat_id: chatId });
  }

  async logSubscriptionView(): Promise<void> {
    await this.logEvent(ANALYTICS_EVENTS.SUBSCRIPTION_VIEW);
  }

  async logSubscriptionStart(plan: string, price: string): Promise<void> {
    await this.logEvent(ANALYTICS_EVENTS.SUBSCRIPTION_START, { plan, price });
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;
