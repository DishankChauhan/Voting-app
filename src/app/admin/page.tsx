'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { mintTokens, getTokenBalance } from '@/services/contractService';
import { toast } from 'react-hot-toast';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Link from 'next/link';
import { Bell, Coins, Users, Database, Settings } from 'lucide-react';

export default function AdminPage() {
  const { user } = useAuth();
  const [receiverAddress, setReceiverAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userBalance, setUserBalance] = useState<string | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  
  useEffect(() => {
    if (user && user.walletAddress) {
      fetchUserBalance();
    }
  }, [user]);
  
  const fetchUserBalance = async () => {
    if (!user || !user.walletAddress) return;
    
    setLoadingBalance(true);
    try {
      const balance = await getTokenBalance(user.walletAddress);
      setUserBalance(balance);
    } catch (error) {
      console.error('Error fetching balance:', error);
      setUserBalance(null);
    } finally {
      setLoadingBalance(false);
    }
  };
  
  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !user.walletAddress) {
      toast.error('Please connect your wallet first');
      return;
    }
    
    if (!receiverAddress || !amount) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    // Check if receiver address is valid Ethereum address
    if (!receiverAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      toast.error('Please enter a valid Ethereum address');
      return;
    }
    
    // Check if amount is a valid number
    if (isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error('Please enter a valid amount greater than 0');
      return;
    }
    
    setIsLoading(true);
    
    try {
      toast.loading('Minting tokens. Please confirm the transaction in your wallet...');
      await mintTokens(receiverAddress, amount);
      toast.dismiss();
      toast.success(`Successfully minted ${amount} tokens to ${receiverAddress.substring(0, 6)}...${receiverAddress.substring(38)}`);
      
      // Refresh the user's balance
      fetchUserBalance();
      
      // Reset form
      setReceiverAddress('');
      setAmount('');
    } catch (error: any) {
      console.error('Error minting tokens:', error);
      toast.dismiss();
      toast.error(`Failed to mint tokens: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-center text-white">Admin Dashboard</h1>
        
        {!user ? (
          <div className="text-center py-8 text-gray-500">
            Please connect your wallet to access admin features.
          </div>
        ) : (
          <>
            {/* Admin Navigation */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Link href="/admin"
                className="bg-gray-800 hover:bg-gray-700 p-6 rounded-lg transition flex flex-col items-center text-center border border-gray-700">
                <Coins className="w-8 h-8 mb-3 text-indigo-400" />
                <h3 className="text-white font-medium mb-1">Token Management</h3>
                <p className="text-gray-400 text-sm">Mint and manage governance tokens</p>
              </Link>
              
              <Link href="/admin/notifications"
                className="bg-gray-800 hover:bg-gray-700 p-6 rounded-lg transition flex flex-col items-center text-center border border-gray-700">
                <Bell className="w-8 h-8 mb-3 text-indigo-400" />
                <h3 className="text-white font-medium mb-1">Notifications</h3>
                <p className="text-gray-400 text-sm">Manage system notifications</p>
              </Link>
              
              <Link href="/admin/users"
                className="bg-gray-800 hover:bg-gray-700 p-6 rounded-lg transition flex flex-col items-center text-center border border-gray-700">
                <Users className="w-8 h-8 mb-3 text-indigo-400" />
                <h3 className="text-white font-medium mb-1">Users</h3>
                <p className="text-gray-400 text-sm">Manage user accounts</p>
              </Link>
              
              <Link href="/admin/settings"
                className="bg-gray-800 hover:bg-gray-700 p-6 rounded-lg transition flex flex-col items-center text-center border border-gray-700">
                <Settings className="w-8 h-8 mb-3 text-indigo-400" />
                <h3 className="text-white font-medium mb-1">System Settings</h3>
                <p className="text-gray-400 text-sm">Configure system parameters</p>
              </Link>
            </div>
            
            <div className="max-w-lg mx-auto bg-gray-900 rounded-lg p-6 shadow-md">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Mint Governance Tokens</h2>
                
                <div className="text-right">
                  <div className="text-sm text-gray-400">Your Token Balance:</div>
                  <div className="text-indigo-400 font-semibold">
                    {loadingBalance ? (
                      'Loading...'
                    ) : userBalance ? (
                      `${parseFloat(userBalance).toFixed(2)} VOTE`
                    ) : (
                      'Not available'
                    )}
                  </div>
                </div>
              </div>
              
              <form onSubmit={handleMint}>
                <div className="mb-4">
                  <label htmlFor="receiverAddress" className="block text-gray-400 mb-2">Receiver Address</label>
                  <input
                    type="text"
                    id="receiverAddress"
                    value={receiverAddress}
                    onChange={(e) => setReceiverAddress(e.target.value)}
                    className="w-full px-4 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-900 focus:outline-none"
                    placeholder="0x..."
                    required
                  />
                </div>
                
                <div className="mb-6">
                  <label htmlFor="amount" className="block text-gray-400 mb-2">Amount</label>
                  <input
                    type="text"
                    id="amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-4 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-900 focus:outline-none"
                    placeholder="100"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Number of tokens to mint (without decimals)</p>
                </div>
                
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Minting...' : 'Mint Tokens'}
                </button>
              </form>
              
              <div className="mt-6 pt-6 border-t border-gray-800">
                <p className="text-gray-500 text-sm">
                  Connected as: <span className="text-gray-300">{user.walletAddress}</span>
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  Contract Addresses:
                </p>
                <p className="text-xs font-mono text-gray-400 mt-1">
                  Token: 0x775F4A912a09291Ae31422b149E0c37760C7AB02
                </p>
                <p className="text-xs font-mono text-gray-400 mt-1">
                  Voting: 0xDE789a8e092004e196ac4A88Cd39d5aB8852402c
                </p>
                <div className="mt-4 text-xs text-gray-500">
                  <p>Note: Only users with admin rights on the token contract can mint new tokens.</p>
                  <p className="mt-1">If you're getting an error, make sure you have the appropriate permissions.</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
} 