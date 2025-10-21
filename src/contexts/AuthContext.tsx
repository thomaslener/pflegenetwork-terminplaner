import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, api } from '../lib/api';

interface User {
  id: string;
  email: string;
}

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'employee';
  region: string | null;
  region_name?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial session
    auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser({ id: session.user.id, email: session.user.email });
        loadProfile();
      } else {
        setLoading(false);
      }
    });

    // Setup periodic token refresh (every 50 minutes)
    const refreshInterval = setInterval(async () => {
      const { error } = await auth.refreshToken();
      if (error) {
        // Token refresh failed, log out user
        signOut();
      }
    }, 50 * 60 * 1000);

    return () => {
      clearInterval(refreshInterval);
    };
  }, []);

  const loadProfile = async () => {
    try {
      const { data, error } = await api.get<Profile>('/auth/me/');

      if (error) throw error;
      if (data) {
        setProfile(data);
        setUser({ id: data.id, email: data.email });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
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
