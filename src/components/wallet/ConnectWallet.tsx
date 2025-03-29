'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

interface ConnectWalletProps {
  fullWidth?: boolean;
  variant?: 'default' | 'small' | 'pill';
}

const ConnectWallet = ({ 
  fullWidth = false, 
  variant = 'default' 
}: ConnectWalletProps) => {
  const { user, login, logout } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectWallet = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      
      const { ethereum } = window as any;
      
      if (!ethereum) {
        setError('MetaMask is not installed. Please install it to use this app.');
        return;
      }
      
      // Request accounts from MetaMask
      const accounts = await ethereum.request({
        method: 'eth_requestAccounts',
      });
      
      if (accounts.length > 0) {
        // Login with the first account
        await login(accounts[0]);
      } else {
        setError('No accounts found. Please create an account in MetaMask.');
      }
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      
      // Handle common errors
      if (error.code === 4001) {
        // User rejected the request
        setError('Connection rejected. Please approve the connection request in your wallet.');
      } else {
        setError(error.message || 'Failed to connect wallet. Please try again.');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  // Button class based on variant
  const getButtonClass = () => {
    const baseClass = `transition-all duration-200 flex items-center justify-center ${fullWidth ? 'w-full' : ''}`;
    
    switch (variant) {
      case 'small':
        return `${baseClass} py-1 px-3 text-sm rounded`;
      case 'pill':
        return `${baseClass} py-1.5 px-4 text-sm rounded-full`;
      default:
        return `${baseClass} py-2 px-5 rounded-lg font-medium`;
    }
  };
  
  // Connected button styles
  const connectedClass = `${getButtonClass()} ${
    variant === 'pill' 
      ? 'bg-green-900/20 text-green-400 border border-green-700 hover:bg-green-900/30'
      : 'bg-gradient-to-r from-green-900/40 to-green-800/40 text-green-400 border border-green-700/50 hover:border-green-600'
  }`;
  
  // Connect button styles
  const connectClass = `${getButtonClass()} ${
    variant === 'pill'
      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
      : 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white'
  }`;

  return (
    <div className={`${fullWidth ? 'w-full' : ''}`}>
      {user ? (
        <button
          onClick={disconnectWallet}
          className={connectedClass}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {formatAddress(user.walletAddress || '')}
        </button>
      ) : (
        <div className={`${fullWidth ? 'w-full' : ''}`}>
          <button
            onClick={connectWallet}
            disabled={isConnecting}
            className={connectClass}
          >
            {isConnecting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connecting...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M17.778 8.222c-4.296-4.296-11.26-4.296-15.556 0A1 1 0 01.808 6.808c5.076-5.077 13.308-5.077 18.384 0a1 1 0 01-1.414 1.414zM14.95 11.05a7 7 0 00-9.9 0 1 1 0 01-1.414-1.414 9 9 0 0112.728 0 1 1 0 01-1.414 1.414zM12.12 13.88a3 3 0 00-4.242 0 1 1 0 01-1.415-1.415 5 5 0 017.072 0 1 1 0 01-1.415 1.415zM9 16a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                Connect Wallet
              </>
            )}
          </button>
          
          {error && (
            <p className="text-red-400 text-xs mt-2 text-center">{error}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ConnectWallet; 