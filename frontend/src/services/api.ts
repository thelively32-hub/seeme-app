import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://presence-real.preview.emergentagent.com';

const TOKEN_KEY = 'seeme_auth_token';
const USER_KEY = 'seeme_user';

class ApiService {
  private token: string | null = null;

  constructor() {
    this.loadToken();
  }

  private async loadToken() {
    try {
      this.token = await AsyncStorage.getItem(TOKEN_KEY);
    } catch (e) {
      console.error('Error loading token:', e);
    }
  }

  async setToken(token: string) {
    this.token = token;
    await AsyncStorage.setItem(TOKEN_KEY, token);
  }

  async clearToken() {
    this.token = null;
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
  }

  async getStoredUser() {
    try {
      const user = await AsyncStorage.getItem(USER_KEY);
      return user ? JSON.parse(user) : null;
    } catch (e) {
      return null;
    }
  }

  async setStoredUser(user: any) {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_URL}${endpoint}`;
    
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

  // Places
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

  // Check-ins
  async checkIn(placeId: string, qrCode?: string) {
    return this.request('/api/checkins', {
      method: 'POST',
      body: JSON.stringify({ place_id: placeId, qr_code: qrCode }),
    });
  }

  async checkOut() {
    return this.request('/api/checkins/checkout', {
      method: 'POST',
    });
  }

  async getCheckinHistory(limit?: number) {
    let query = '/api/checkins/history';
    if (limit) query += `?limit=${limit}`;
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
