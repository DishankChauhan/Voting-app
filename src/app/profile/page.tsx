'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { getVotingPower, getDelegationStatus } from '@/services/contractService';
import DelegationManager from '@/components/DelegationManager';
import { logger } from '@/utils/logger';

export default function ProfilePage() {
  const { user } = useAuth();
  const [votingPower, setVotingPower] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(true);
  const [delegationInfo, setDelegationInfo] = useState<{
    hasDelegated: boolean;
    delegatee: string | null;
  }>({ hasDelegated: false, delegatee: null });

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.walletAddress) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Fetch voting power
        const power = await getVotingPower(user.walletAddress);
        setVotingPower(power);
        
        // Fetch delegation status
        const status = await getDelegationStatus(user.walletAddress);
        setDelegationInfo(status);
        
        logger.debug('Fetched user profile data', { votingPower: power, delegationStatus: status });
      } catch (error) {
        logger.error('Error fetching user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [user?.walletAddress]);

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8">Your Profile</h1>
          
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* User Information */}
              <div className="md:col-span-1">
                <div className="bg-gray-900 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <div className="bg-indigo-700/30 rounded-full p-3 mr-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-white">{user?.displayName || 'User'}</h2>
                      {user?.email && <p className="text-gray-400 text-sm">{user.email}</p>}
                    </div>
                  </div>
                  
                  {user?.walletAddress ? (
                    <div className="bg-gray-800/50 p-4 rounded-lg mb-4">
                      <p className="text-gray-400 text-sm mb-1">Connected Wallet</p>
                      <p className="text-indigo-400 font-mono text-xs break-all">{user.walletAddress}</p>
                    </div>
                  ) : (
                    <div className="bg-amber-900/30 p-4 rounded-lg mb-4">
                      <p className="text-amber-400 text-sm">
                        No wallet connected. Connect your wallet to participate in governance.
                      </p>
                    </div>
                  )}
                  
                  <div className="flex flex-col">
                    <div className="flex justify-between items-center py-3 border-b border-gray-800">
                      <span className="text-gray-400">Voting Power</span>
                      <span className="text-white font-medium">{parseFloat(votingPower).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-800">
                      <span className="text-gray-400">Delegation Status</span>
                      <span className="text-white font-medium">
                        {delegationInfo.hasDelegated ? 'Delegated' : 'Not Delegated'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-gray-400">Account Type</span>
                      <span className="text-white font-medium">
                        {user?.isAdmin ? 'Admin' : 'User'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Delegation Manager */}
              <div className="md:col-span-2">
                <DelegationManager />
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
} 