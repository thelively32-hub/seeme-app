import Purchases, { 
  PurchasesPackage, 
  CustomerInfo,
  PurchasesOffering,
  LOG_LEVEL,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import api from './api';

// RevenueCat API Keys
const REVENUECAT_API_KEY_ANDROID = 'goog_pkPOlOUWjajEGjrvfDXmTpnpnmk';
const REVENUECAT_API_KEY_IOS = ''; // Add iOS key when available

// Entitlement ID for premium access
export const PREMIUM_ENTITLEMENT_ID = 'premium';

// Product IDs
export const PRODUCT_IDS = {
  MONTHLY: 'seeme_premium_monthly',
  YEARLY: 'seeme_premium_yearly',
};

class RevenueCatService {
  private initialized = false;

  async initialize(userId?: string): Promise<void> {
    if (this.initialized) return;

    try {
      // Set log level for debugging
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);

      // Configure with platform-specific key
      const apiKey = Platform.OS === 'ios' 
        ? REVENUECAT_API_KEY_IOS 
        : REVENUECAT_API_KEY_ANDROID;

      if (!apiKey) {
        console.warn('RevenueCat: No API key for platform', Platform.OS);
        return;
      }

      await Purchases.configure({ apiKey });

      // Set user ID if available (for linking purchases to our backend user)
      if (userId) {
        await Purchases.logIn(userId);
      }

      this.initialized = true;
      console.log('RevenueCat initialized successfully');
    } catch (error) {
      console.error('Failed to initialize RevenueCat:', error);
    }
  }

  async login(userId: string): Promise<void> {
    try {
      await Purchases.logIn(userId);
      console.log('RevenueCat: User logged in', userId);
    } catch (error) {
      console.error('RevenueCat login error:', error);
    }
  }

  async logout(): Promise<void> {
    try {
      await Purchases.logOut();
      console.log('RevenueCat: User logged out');
    } catch (error) {
      console.error('RevenueCat logout error:', error);
    }
  }

  async getOfferings(): Promise<PurchasesOffering | null> {
    try {
      const offerings = await Purchases.getOfferings();
      
      if (offerings.current) {
        console.log('RevenueCat: Current offering', offerings.current.identifier);
        return offerings.current;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get offerings:', error);
      return null;
    }
  }

  async getCustomerInfo(): Promise<CustomerInfo | null> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      return customerInfo;
    } catch (error) {
      console.error('Failed to get customer info:', error);
      return null;
    }
  }

  async isPremium(): Promise<boolean> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      return customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;
    } catch (error) {
      console.error('Failed to check premium status:', error);
      return false;
    }
  }

  async purchasePackage(packageToPurchase: PurchasesPackage): Promise<{ success: boolean; customerInfo?: CustomerInfo; error?: string }> {
    try {
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      
      // Check if purchase was successful
      const isPremium = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;
      
      if (isPremium) {
        // Sync with our backend
        await this.syncPremiumStatusWithBackend(true);
      }
      
      return { success: isPremium, customerInfo };
    } catch (error: any) {
      // User cancelled or error occurred
      if (error.userCancelled) {
        return { success: false, error: 'cancelled' };
      }
      
      console.error('Purchase error:', error);
      return { success: false, error: error.message || 'Purchase failed' };
    }
  }

  async restorePurchases(): Promise<{ success: boolean; isPremium: boolean; error?: string }> {
    try {
      const customerInfo = await Purchases.restorePurchases();
      const isPremium = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;
      
      // Sync with backend
      await this.syncPremiumStatusWithBackend(isPremium);
      
      return { success: true, isPremium };
    } catch (error: any) {
      console.error('Restore error:', error);
      return { success: false, isPremium: false, error: error.message };
    }
  }

  private async syncPremiumStatusWithBackend(isPremium: boolean): Promise<void> {
    try {
      await api.updatePremiumStatus(isPremium);
      console.log('Premium status synced with backend:', isPremium);
    } catch (error) {
      console.error('Failed to sync premium status with backend:', error);
    }
  }

  // Listen for subscription changes
  addCustomerInfoUpdateListener(callback: (info: CustomerInfo) => void): void {
    Purchases.addCustomerInfoUpdateListener(callback);
  }
}

export const revenueCatService = new RevenueCatService();
export default revenueCatService;
