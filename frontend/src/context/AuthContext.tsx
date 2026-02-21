import React, { createContext, useContext, useState, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  age: number;
  gender: 'man' | 'woman' | 'nonbinary';
  lookingFor: ('men' | 'women' | 'everyone')[];
  intention: 'friends' | 'date' | 'casual';
  vibes: number;
  connectionRate: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: Partial<User> & { password: string }) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string) => {
    // Mock login - replace with real API call
    setUser({
      id: '1',
      name: 'Alex',
      email: email,
      age: 25,
      gender: 'man',
      lookingFor: ['women'],
      intention: 'date',
      vibes: 124,
      connectionRate: 18,
    });
  };

  const signup = async (data: Partial<User> & { password: string }) => {
    // Mock signup - replace with real API call
    setUser({
      id: '1',
      name: data.name || 'New User',
      email: data.email || '',
      age: data.age || 25,
      gender: data.gender || 'man',
      lookingFor: data.lookingFor || ['everyone'],
      intention: data.intention || 'friends',
      vibes: 0,
      connectionRate: 0,
    });
  };

  const logout = () => {
    setUser(null);
  };

  const updateUser = (data: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...data });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        updateUser,
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
