import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import { getTokenBalance } from '@/services/contractService';

// Define user type
export interface User {
  walletAddress: string;
  tokenBalance?: string;
}

// Define context type
interface AuthContextType {
  user: User | null;
  loading: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  error: string | null;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  connectWallet: async () => {},
  disconnectWallet: () => {},
  error: null,
});

// Hook for easy context use
export const useAuth = () => useContext(AuthContext);

// Provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize - Check if the user was previously connected
  useEffect(() => {
    checkIfWalletIsConnected();
  }, []);

  // Check if wallet is already connected
  const checkIfWalletIsConnected = async () => {
    try {
      const { ethereum } = window as any;
      
      if (!ethereum) {
        setLoading(false);
        return;
      }

      // Check if we're authorized to access the user's wallet
      const accounts = await ethereum.request({ method: 'eth_accounts' });
      
      if (accounts.length > 0) {
        const address = accounts[0];
        // Update state
        setUser({
          walletAddress: address,
        });
        
        // Setup listener for account changes
        setupEventListeners();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to check wallet connection');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Set up event listeners for Metamask
  const setupEventListeners = () => {
    const { ethereum } = window as any;
    
    if (ethereum) {
      // Handle account change
      ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          // Metamask is locked or the user has not connected any accounts
          setUser(null);
        } else {
          setUser({
            walletAddress: accounts[0],
          });
        }
      });

      // Handle chain change
      ethereum.on('chainChanged', (_chainId: string) => {
        // Reload the page when they change networks
        window.location.reload();
      });
    }
  };

  // Connect wallet
  const connectWallet = async () => {
    try {
      setError(null);
      const { ethereum } = window as any;
      
      if (!ethereum) {
        setError('Please install MetaMask to use this app');
        return;
      }
      
      setLoading(true);
      
      // Request access to accounts
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      
      // Get network ID
      const provider = new ethers.BrowserProvider(ethereum);
      const network = await provider.getNetwork();
      
      // Check if network is Sepolia (chain ID 11155111)
      if (network.chainId.toString() !== '11155111') {
        // Prompt user to switch to Sepolia
        try {
          await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }], // chainId in hex
          });
        } catch (switchError: any) {
          // This error code indicates that the chain has not been added to MetaMask
          if (switchError.code === 4902) {
            try {
              await ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: '0xaa36a7',
                  chainName: 'Sepolia Testnet',
                  nativeCurrency: {
                    name: 'Sepolia ETH',
                    symbol: 'ETH',
                    decimals: 18
                  },
                  rpcUrls: ['https://sepolia.infura.io/v3/'],
                  blockExplorerUrls: ['https://sepolia.etherscan.io']
                }],
              });
            } catch (addError) {
              throw new Error('Failed to add Sepolia network to MetaMask');
            }
          } else {
            throw switchError;
          }
        }
      }
      
      // Set user after successful connection
      setUser({
        walletAddress: accounts[0],
      });
      
      // Set up event listeners
      setupEventListeners();
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setUser(null);
    // Note: MetaMask doesn't actually have a "disconnect" method
    // We're just removing the user from the app state
  };

  // Create context value
  const value = {
    user,
    loading,
    connectWallet,
    disconnectWallet,
    error,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 