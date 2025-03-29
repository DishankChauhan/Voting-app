'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import { getProvider } from '@/services/contractService';
import { toast } from 'react-hot-toast';
import { logger } from '@/utils/logger';
import { User as FirebaseUser } from 'firebase/auth';
import { getUserProfile } from '@/services/firebaseService';

export type User = {
  walletAddress?: string;
  firebaseUser?: FirebaseUser | null;
  displayName?: string;
  email?: string;
  isAdmin?: boolean;
  isAuthenticated: boolean;
};

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  login: (address: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage and/or wallet on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        setLoading(true);
        // Try to get ethereum provider
        const provider = await getProvider();
        const firebaseUserStr = localStorage.getItem('firebase-user');
        const firebaseUser = firebaseUserStr ? JSON.parse(firebaseUserStr) : null;
        
        // If Firebase user exists, make sure the auth token cookie is set
        if (firebaseUser) {
          // Set cookie for server-side authentication if it doesn't exist
          if (!document.cookie.includes('auth-token')) {
            document.cookie = `auth-token=true; path=/; max-age=${60 * 60 * 24 * 7}`; // 7 days
            logger.debug('Auth token cookie set');
          }
        }
        
        // Check if already connected
        if (provider && window.ethereum) {
          const accounts = await provider.send("eth_accounts", []);
          
          if (accounts.length > 0) {
            const address = accounts[0];
            logger.debug('Wallet already connected:', { address });
            
            // Get user profile if available
            let userProfile = null;
            if (address) {
              try {
                userProfile = await getUserProfile(address);
              } catch (error) {
                logger.warn('Failed to load user profile:', error);
              }
            }
            
            setUser({
              walletAddress: address,
              firebaseUser,
              displayName: userProfile?.displayName || firebaseUser?.displayName,
              email: firebaseUser?.email,
              isAdmin: userProfile?.isAdmin || false,
              isAuthenticated: !!firebaseUser
            });
          } else if (firebaseUser) {
            // User is authenticated with Firebase but doesn't have wallet connected
            setUser({
              firebaseUser,
              displayName: firebaseUser.displayName || undefined,
              email: firebaseUser.email || undefined,
              isAuthenticated: true
            });
          } else {
            setUser(null);
          }
        } else if (firebaseUser) {
          // Only Firebase authentication, no wallet
          setUser({
            firebaseUser,
            displayName: firebaseUser.displayName || undefined,
            email: firebaseUser.email || undefined,
            isAuthenticated: true
          });
        } else {
          setUser(null);
        }
      } catch (error) {
        logger.error('Error initializing auth:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
    
    // Listen for account changes
    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        // User disconnected wallet
        const firebaseUserStr = localStorage.getItem('firebase-user');
        const firebaseUser = firebaseUserStr ? JSON.parse(firebaseUserStr) : null;
        
        if (firebaseUser) {
          setUser({
            firebaseUser,
            displayName: firebaseUser.displayName || undefined,
            email: firebaseUser.email || undefined,
            isAuthenticated: true
          });
        } else {
          setUser(null);
        }
        
        logger.debug('Wallet disconnected');
      } else {
        const address = accounts[0];
        const firebaseUserStr = localStorage.getItem('firebase-user');
        const firebaseUser = firebaseUserStr ? JSON.parse(firebaseUserStr) : null;
        
        // Get user profile if available
        let userProfile = null;
        if (address) {
          try {
            userProfile = await getUserProfile(address);
          } catch (error) {
            logger.warn('Failed to load user profile:', error);
          }
        }
        
        setUser({
          walletAddress: address,
          firebaseUser,
          displayName: userProfile?.displayName || firebaseUser?.displayName,
          email: firebaseUser?.email,
          isAdmin: userProfile?.isAdmin || false,
          isAuthenticated: !!firebaseUser
        });
        
        logger.debug('Wallet account changed:', { address });
      }
    };

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, []);

  // Connect wallet function
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        toast.error('Please install MetaMask to connect your wallet');
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      
      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }
      
      const address = accounts[0];
      await login(address);
    } catch (error: any) {
      logger.error('Error connecting wallet:', error);
      
      if (error.code === 4001) {
        // User rejected request
        toast.error('You rejected the connection request');
      } else {
        toast.error('Failed to connect wallet');
      }
    }
  };

  // Login with address
  const login = async (address: string) => {
    try {
      const firebaseUserStr = localStorage.getItem('firebase-user');
      const firebaseUser = firebaseUserStr ? JSON.parse(firebaseUserStr) : null;
      
      // Get user profile if available
      let userProfile = null;
      if (address) {
        try {
          userProfile = await getUserProfile(address);
        } catch (error) {
          logger.warn('Failed to load user profile:', error);
        }
      }
      
      setUser({
        walletAddress: address,
        firebaseUser,
        displayName: userProfile?.displayName || firebaseUser?.displayName,
        email: firebaseUser?.email,
        isAdmin: userProfile?.isAdmin || false,
        isAuthenticated: !!firebaseUser
      });
      
      toast.success('Wallet connected successfully');
      logger.debug('Wallet connected:', { address });
    } catch (error) {
      logger.error('Error in login:', error);
      toast.error('Failed to connect wallet');
      throw error;
    }
  };

  // Disconnect wallet function
  const disconnectWallet = () => {
    const firebaseUserStr = localStorage.getItem('firebase-user');
    const firebaseUser = firebaseUserStr ? JSON.parse(firebaseUserStr) : null;
    
    if (firebaseUser) {
      setUser({
        firebaseUser,
        displayName: firebaseUser.displayName || undefined,
        email: firebaseUser.email || undefined,
        isAuthenticated: true
      });
    } else {
      setUser(null);
    }
    
    toast.success('Wallet disconnected');
    logger.debug('Wallet disconnected');
  };
  
  // Logout function - clears Firebase user and disconnects wallet
  const logout = async () => {
    try {
      // Clear Firebase user from localStorage
      localStorage.removeItem('firebase-user');
      
      // Clear auth token cookie (will be handled by middleware)
      document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      
      // Reset user state
      setUser(null);
      
      toast.success('Logged out successfully');
      logger.debug('User logged out');
      
      // Redirect to landing page
      window.location.href = '/landing';
    } catch (error) {
      logger.error('Error logging out:', error);
      toast.error('Failed to log out');
    }
  };
  
  // Refresh user data
  const refreshUser = async () => {
    try {
      setLoading(true);
      
      const firebaseUserStr = localStorage.getItem('firebase-user');
      const firebaseUser = firebaseUserStr ? JSON.parse(firebaseUserStr) : null;
      
      // Get user profile if wallet is connected
      let userProfile = null;
      if (user?.walletAddress) {
        try {
          userProfile = await getUserProfile(user.walletAddress);
        } catch (error) {
          logger.warn('Failed to load user profile:', error);
        }
      }
      
      if (user?.walletAddress || firebaseUser) {
        setUser({
          ...user,
          firebaseUser,
          displayName: userProfile?.displayName || firebaseUser?.displayName,
          email: firebaseUser?.email,
          isAdmin: userProfile?.isAdmin || false,
          isAuthenticated: !!firebaseUser
        });
      } else {
        setUser(null);
      }
    } catch (error) {
      logger.error('Error refreshing user data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        connectWallet,
        disconnectWallet,
        logout,
        refreshUser,
        login
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 