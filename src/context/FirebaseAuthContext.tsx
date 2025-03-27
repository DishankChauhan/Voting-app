'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { registerUser, loginUser, logoutUser, onAuthChange, getCurrentUser } from '@/services/firebaseService';

interface FirebaseAuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  register: (email: string, password: string, displayName: string) => Promise<FirebaseUser>;
  login: (email: string, password: string) => Promise<FirebaseUser>;
  logout: () => Promise<void>;
  error: string | null;
}

const FirebaseAuthContext = createContext<FirebaseAuthContextType | undefined>(undefined);

export const FirebaseAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthChange((authUser) => {
      setUser(authUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const register = async (email: string, password: string, displayName: string) => {
    setError(null);
    try {
      const user = await registerUser(email, password, displayName);
      return user;
    } catch (error: any) {
      setError(error.message || 'An error occurred during registration');
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const user = await loginUser(email, password);
      return user;
    } catch (error: any) {
      setError(error.message || 'An error occurred during login');
      throw error;
    }
  };

  const logout = async () => {
    setError(null);
    try {
      await logoutUser();
    } catch (error: any) {
      setError(error.message || 'An error occurred during logout');
      throw error;
    }
  };

  const value = {
    user,
    loading,
    register,
    login,
    logout,
    error
  };

  return (
    <FirebaseAuthContext.Provider value={value}>
      {children}
    </FirebaseAuthContext.Provider>
  );
};

export const useFirebaseAuth = () => {
  const context = useContext(FirebaseAuthContext);
  if (context === undefined) {
    throw new Error('useFirebaseAuth must be used within a FirebaseAuthProvider');
  }
  return context;
}; 