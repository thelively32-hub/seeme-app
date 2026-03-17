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
        throw new Error(data.detail || 'Request failed');
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

  // Stats
  async getUserStats() {
    return this.request('/api/stats/user');
  }

  // Health
  async healthCheck() {
    return this.request('/api/health');
  }
}

export const api = new ApiService();
export default api;
