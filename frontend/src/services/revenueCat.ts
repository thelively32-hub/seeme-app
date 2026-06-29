/**
 * RevenueCat service - stubbed out while react-native-purchases
 * is temporarily removed for iOS 26 compatibility
 */

export const PREMIUM_ENTITLEMENT_ID = 'premium';

export const PRODUCT_IDS = {
  MONTHLY: 'seeme_premium_monthly',
  YEARLY: 'seeme_premium_yearly',
};

class RevenueCatService {
  async initialize(userId?: string): Promise<void> {
    // Stubbed
  }

  async getOfferings(): Promise<any> {
    return null;
  }

  async purchasePackage(pkg: any): Promise<{ success: boolean; error?: string }> {
    return { success: false, error: 'Premium purchases coming soon!' };
  }

  async restorePurchases(): Promise<{ success: boolean; isPremium?: boolean; error?: string }> {
    return { success: false, error: 'No purchases to restore.' };
  }

  async checkPremiumStatus(): Promise<boolean> {
    return false;
  }
}

export const revenueCatService = new RevenueCatService();
export default revenueCatService;
