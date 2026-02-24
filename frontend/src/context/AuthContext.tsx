import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
  age: number | null;
  gender: string | null;
  looking_for: string[] | null;
  intention: string | null;
  vibes: number;
  connection_rate: number;
  is_premium: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  setVibe: (gender: string, lookingFor: string[], intention: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const storedUser = await api.getStoredUser();
      if (storedUser) {
        setUser(storedUser);
        // Verify token is still valid
        try {
          const freshUser = await api.getMe();
          setUser(freshUser);
        } catch (e) {
          // Token invalid, clear it
          await api.logout();
          setUser(null);
        }
      }
    } catch (e) {
      console.error('Error loading user:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await api.login(email, password);
    setUser(response.user);
  };

  const signup = async (name: string, email: string, password: string) => {
    const response = await api.register(name, email, password);
    setUser(response.user);
  };

  const setVibe = async (gender: string, lookingFor: string[], intention: string) => {
    const updatedUser = await api.setVibe(gender, lookingFor, intention);
    setUser(updatedUser);
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const freshUser = await api.getMe();
      setUser(freshUser);
    } catch (e) {
      console.error('Error refreshing user:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        setVibe,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
