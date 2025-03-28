'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth } from '@/config/firebase';
import { logger } from '@/utils/logger';

interface FirebaseAuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const FirebaseAuthContext = createContext<FirebaseAuthContextType | undefined>(undefined);

export function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      logger.debug('Auth state changed:', user ? 'User logged in' : 'User logged out');
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      logger.debug('Login successful:', userCredential.user.email);
      
      // Store user data in localStorage for client-side auth
      localStorage.setItem('firebase-user', JSON.stringify(userCredential.user));
      
      // Set auth token cookie for server-side auth
      document.cookie = `auth-token=true; path=/; max-age=${60 * 60 * 24 * 7}`;
    } catch (error: any) {
      logger.error('Login error:', error);
      setError(error.message);
      throw error;
    }
  };

  const register = async (email: string, password: string, displayName: string) => {
    try {
      setError(null);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      logger.debug('Registration successful:', userCredential.user.email);
      
      // Store user data in localStorage for client-side auth
      localStorage.setItem('firebase-user', JSON.stringify(userCredential.user));
      
      // Set auth token cookie for server-side auth
      document.cookie = `auth-token=true; path=/; max-age=${60 * 60 * 24 * 7}`;
    } catch (error: any) {
      logger.error('Registration error:', error);
      setError(error.message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await signOut(auth);
      logger.debug('Logout successful');
      
      // Clear user data from localStorage
      localStorage.removeItem('firebase-user');
      
      // Clear auth token cookie
      document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    } catch (error: any) {
      logger.error('Logout error:', error);
      setError(error.message);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout
  };

  return (
    <FirebaseAuthContext.Provider value={value}>
      {!loading && children}
    </FirebaseAuthContext.Provider>
  );
}

export function useFirebaseAuth() {
  const context = useContext(FirebaseAuthContext);
  if (context === undefined) {
    throw new Error('useFirebaseAuth must be used within a FirebaseAuthProvider');
  }
  return context;
} 