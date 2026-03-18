import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://presence-real.preview.emergentagent.com';

const TOKEN_KEY = 'seeme_auth_token';
const USER_KEY = 'seeme_user';

class ApiService {
  private token: string | null = null;
  private initialized: boolean = false;

  async init() {
    if (this.initialized) return;
    await this.loadToken();
    this.initialized = true;
  }

  private async loadToken() {
    try {
      // Skip on server-side rendering
      if (Platform.OS === 'web' && typeof window === 'undefined') {
        return;
      }
      this.token = await AsyncStorage.getItem(TOKEN_KEY);
    } catch (e) {
      // Token will be loaded when needed
    }
  }

  async setToken(token: string) {
    this.token = token;
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch (e) {
      console.log('Could not save token');
    }
  }

  async clearToken() {
    this.token = null;
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
    } catch (e) {
      // Ignore
    }
  }

  async getStoredUser() {
    try {
      if (Platform.OS === 'web' && typeof window === 'undefined') {
        return null;
      }
      const user = await AsyncStorage.getItem(USER_KEY);
      return user ? JSON.parse(user) : null;
    } catch (e) {
      return null;
    }
  }

  async setStoredUser(user: any) {
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (e) {
      // Ignore
    }
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_URL}${endpoint}`;
    
    // Ensure token is loaded
    if (!this.initialized) {
      await this.init();
    }
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle different error formats
        let errorMessage = 'Request failed';
        if (typeof data.detail === 'string') {
          errorMessage = data.detail;
        } else if (Array.isArray(data.detail)) {
          // Pydantic validation errors
          errorMessage = data.detail.map((e: any) => e.msg || e.message || JSON.stringify(e)).join(', ');
        } else if (data.detail && typeof data.detail === 'object') {
          errorMessage = data.detail.msg || data.detail.message || JSON.stringify(data.detail);
        } else if (data.message) {
          errorMessage = data.message;
        }
        throw new Error(errorMessage);
      }

      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // Auth
  async register(name: string, email: string, password: string, age?: number) {
    const data = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, age }),
    });
    await this.setToken(data.access_token);
    await this.setStoredUser(data.user);
    return data;
  }

  async login(email: string, password: string) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await this.setToken(data.access_token);
    await this.setStoredUser(data.user);
    return data;
  }

  async getMe() {
    return this.request('/api/auth/me');
  }

  async setVibe(gender: string, lookingFor: string[], intention: string) {
    const data = await this.request('/api/auth/vibe', {
      method: 'PUT',
      body: JSON.stringify({
        gender,
        looking_for: lookingFor,
        intention,
      }),
    });
    await this.setStoredUser(data);
    return data;
  }

  async logout() {
    await this.clearToken();
  }

  // Places - Updated for new activity system
  async getPlaces(type?: string, trending?: boolean, limit?: number) {
    let query = '/api/places?';
    if (type) query += `type=${type}&`;
    if (trending !== undefined) query += `trending=${trending}&`;
    if (limit) query += `limit=${limit}`;
    return this.request(query);
  }

  async getPlace(placeId: string) {
    return this.request(`/api/places/${placeId}`);
  }

  // Check-ins with GPS validation
  async checkIn(
    placeId: string,
    location?: {
      latitude: number;
      longitude: number;
      accuracy: number;
      isMocked: boolean;
    }
  ) {
    const body: any = { place_id: placeId };
    
    if (location) {
      body.user_latitude = location.latitude;
      body.user_longitude = location.longitude;
      body.gps_accuracy = location.accuracy;
      body.is_mocked = location.isMocked;
    }
    
    return this.request('/api/checkins', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async validateLocation(
    placeId: string,
    latitude: number,
    longitude: number,
    accuracy: number,
    isMocked: boolean = false
  ) {
    return this.request('/api/checkins/validate-location', {
      method: 'POST',
      body: JSON.stringify({
        place_id: placeId,
        user_latitude: latitude,
        user_longitude: longitude,
        gps_accuracy: accuracy,
        is_mocked: isMocked,
      }),
    });
  }

  async checkOut() {
    return this.request('/api/checkins/checkout', {
      method: 'POST',
    });
  }

  async getActiveCheckin() {
    return this.request('/api/checkins/active');
  }

  async getCheckinHistory(limit?: number) {
    let query = '/api/checkins/history';
    if (limit) query += `?limit=${limit}`;
    return this.request(query);
  }

  // Nearby Places with Google Places integration
  async getNearbyPlaces(lat: number, lng: number, radius?: number, limit?: number) {
    let query = `/api/places/nearby?lat=${lat}&lng=${lng}`;
    if (radius) query += `&radius=${radius}`;
    if (limit) query += `&limit=${limit}`;
    return this.request(query);
  }

  // Profile
  async updateProfile(data: { 
    name?: string; 
    gender?: string; 
    looking_for?: string[]; 
    intention?: string;
    bio?: string;
    photo_url?: string;
    age?: number;
    status_message?: string;
  }) {
    const result = await this.request('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    await this.setStoredUser(result);
    return result;
  }

  async deleteAccount() {
    await this.request('/api/auth/account', {
      method: 'DELETE',
    });
    await this.clearToken();
  }

  // Password Reset
  async requestPasswordReset(email: string) {
    return this.request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  // Stats
  async getUserStats() {
    return this.request('/api/stats/user');
  }

  // Profile alias
  async getProfile() {
    return this.getMe();
  }

  // ============== VIBE SYSTEM ==============
  
  // Get users at a specific place
  async getUsersAtPlace(placeId: string) {
    return this.request(`/api/places/${placeId}/users`);
  }

  // Send a vibe to another user
  async sendVibe(toUserId: string, message: string = "Hey! 👋", vibeType: string = "wave", placeId?: string) {
    return this.request('/api/vibes/send', {
      method: 'POST',
      body: JSON.stringify({
        to_user_id: toUserId,
        message,
        vibe_type: vibeType,
        place_id: placeId,
      }),
    });
  }

  // Get received vibes
  async getReceivedVibes() {
    return this.request('/api/vibes/received');
  }

  // Get sent vibes
  async getSentVibes() {
    return this.request('/api/vibes/sent');
  }

  // Respond to a vibe (accept/decline)
  async respondToVibe(vibeId: string, action: 'accept' | 'decline') {
    return this.request(`/api/vibes/${vibeId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  }

  // Get vibe stats and limits
  async getVibeStats() {
    return this.request('/api/vibes/stats');
  }

  // ============== USER PROFILES ==============

  // Get another user's profile
  async getUserProfile(userId: string) {
    return this.request(`/api/users/${userId}/profile`);
  }

  // Get who viewed my profile
  async getProfileViews() {
    return this.request('/api/users/me/views');
  }

  // ============== REVIEWS ==============

  // Create a review for a user
  async createReview(userId: string, rating: number, tags: string[] = [], comment?: string) {
    return this.request('/api/reviews', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        rating,
        tags,
        comment,
      }),
    });
  }

  // ============== QR CHECK-IN ==============

  // Check-in via QR code scan
  async qrCheckin(qrData: string, vibeId?: string | null) {
    return this.request('/api/checkin/qr', {
      method: 'POST',
      body: JSON.stringify({
        qr_data: qrData,
        vibe_id: vibeId,
      }),
    });
  }

  // Get place by ID (for QR scanning)
  async getPlaceById(placeId: string) {
    return this.request(`/api/places/${placeId}`);
  }

  // ============== DEFAULT VIBE ==============

  // Update user's default vibe
  async updateDefaultVibe(vibeId: string) {
    return this.request('/api/user/default-vibe', {
      method: 'PUT',
      body: JSON.stringify({ vibe_id: vibeId }),
    });
  }

  // Get user's default vibe
  async getDefaultVibe() {
    return this.request('/api/user/default-vibe');
  }

  // ============== BUSINESS PARTNER ==============

  // Register a new business
  async registerBusiness(data: {
    name: string;
    type: string;
    address: string;
    latitude: number;
    longitude: number;
    phone?: string;
    email?: string;
    description?: string;
  }) {
    return this.request('/api/business/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Get my registered businesses
  async getMyBusinesses() {
    return this.request('/api/business/my-businesses');
  }

  // Get QR code data for a business
  async getBusinessQR(businessId: string) {
    return this.request(`/api/business/${businessId}/qr`);
  }

  // ============== CHAT ==============

  // Get all my active chats
  async getMyChats() {
    return this.request('/api/chats');
  }

  // Get a specific chat with messages
  async getChat(chatId: string) {
    return this.request(`/api/chats/${chatId}`);
  }

  // Send a message in a chat
  async sendMessage(chatId: string, content: string) {
    return this.request(`/api/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  // Get unread message count
  async getUnreadCount() {
    return this.request('/api/chats/unread/count');
  }

  // ============== SAFETY & SECURITY ==============

  // Report a user
  async reportUser(userId: string, reason: string, details?: string) {
    return this.request('/api/safety/report', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        reason,
        details,
      }),
    });
  }

  // Block a user
  async blockUser(userId: string) {
    return this.request('/api/safety/block', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  }

  // Unblock a user
  async unblockUser(userId: string) {
    return this.request(`/api/safety/block/${userId}`, {
      method: 'DELETE',
    });
  }

  // Get blocked users
  async getBlockedUsers() {
    return this.request('/api/safety/blocked');
  }

  // Set emergency contact
  async setEmergencyContact(contact: {
    name: string;
    phone: string;
    relationship?: string;
  }) {
    return this.request('/api/safety/emergency-contact', {
      method: 'POST',
      body: JSON.stringify(contact),
    });
  }

  // Get emergency contact
  async getEmergencyContact() {
    return this.request('/api/safety/emergency-contact');
  }

  // Share date location
  async shareDate(data: {
    contact_name: string;
    contact_phone: string;
    place_name: string;
    notes?: string;
    duration_hours?: number;
  }) {
    return this.request('/api/safety/share-date', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Submit photo verification
  async submitPhotoVerification(selfieBase64: string) {
    return this.request('/api/safety/verify-photo', {
      method: 'POST',
      body: JSON.stringify({ selfie_base64: selfieBase64 }),
    });
  }

  // Get verification status
  async getVerificationStatus() {
    return this.request('/api/safety/verification-status');
  }

  // ============== PRESENCE & STATUS ==============

  // Get suggested status messages
  async getSuggestedStatusMessages() {
    return this.request('/api/presence/status-messages');
  }

  // Update status message
  async updateStatusMessage(message?: string, suggestedId?: string) {
    return this.request('/api/presence/status', {
      method: 'PUT',
      body: JSON.stringify({
        message,
        suggested_id: suggestedId,
      }),
    });
  }

  // Clear status message
  async clearStatusMessage() {
    return this.request('/api/presence/status', {
      method: 'DELETE',
    });
  }

  // Toggle ghost mode (Premium only)
  async toggleGhostMode(enabled: boolean) {
    return this.request('/api/presence/ghost-mode', {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    });
  }

  // Update presence (GPS check)
  async updatePresence(latitude: number, longitude: number, accuracy?: number) {
    return this.request('/api/presence/update', {
      method: 'POST',
      body: JSON.stringify({
        latitude,
        longitude,
        accuracy,
      }),
    });
  }

  // Get my presence status
  async getMyPresence() {
    return this.request('/api/presence/me');
  }

  // ============== INVITATIONS ("Quién para...") ==============

  // Get all active invitations
  async getInvitations(paymentType?: string, limit?: number) {
    let query = '/api/invitations?';
    if (paymentType) query += `payment_type=${paymentType}&`;
    if (limit) query += `limit=${limit}`;
    return this.request(query);
  }

  // Get invitation detail
  async getInvitation(invitationId: string) {
    return this.request(`/api/invitations/${invitationId}`);
  }

  // Create a new invitation
  async createInvitation(data: {
    text: string;
    payment_type: 'full' | 'half';
    event_date: string;
    event_time?: string;
    place_name?: string;
    place_address?: string;
    target_user_id?: string;
  }) {
    return this.request('/api/invitations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Respond to an invitation ("Me interesa")
  async respondToInvitation(invitationId: string, message?: string) {
    return this.request(`/api/invitations/${invitationId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  // Get my created invitations
  async getMyInvitations() {
    return this.request('/api/invitations/my/created');
  }

  // Delete my invitation
  async deleteInvitation(invitationId: string) {
    return this.request(`/api/invitations/${invitationId}`, {
      method: 'DELETE',
    });
  }

  // Get responses to my invitation
  async getInvitationResponses(invitationId: string) {
    return this.request(`/api/invitations/${invitationId}/responses`);
  }

  // Accept a response to my invitation
  async acceptInvitationResponse(invitationId: string, userId: string) {
    return this.request(`/api/invitations/${invitationId}/accept/${userId}`, {
      method: 'POST',
    });
  }

  // Reject a response to my invitation
  async rejectInvitationResponse(invitationId: string, userId: string) {
    return this.request(`/api/invitations/${invitationId}/reject/${userId}`, {
      method: 'POST',
    });
  }

  // Search users (Premium only)
  async searchUsers(query: string) {
    return this.request(`/api/users/search?query=${encodeURIComponent(query)}`);
  }

  // ============== REVIEWS & RATINGS ==============

  // Rate a user (5-star system)
  async rateUser(userId: string, rating: number, comment?: string) {
    return this.request(`/api/users/${userId}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment }),
    });
  }

  // Get user reviews
  async getUserReviews(userId: string) {
    return this.request(`/api/users/${userId}/reviews`);
  }

  // Health
  async healthCheck() {
    return this.request('/api/health');
  }
}

export const api = new ApiService();
export default api;
