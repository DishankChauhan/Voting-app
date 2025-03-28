'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  getAllDelegates, 
  getVotingPower, 
  delegateVotes, 
  ContractServiceError, 
  ContractErrorType 
} from '@/services/contractService';
import { toast } from 'react-hot-toast';
import { logger } from '@/utils/logger';
import { validateEthereumAddress, validateVotingPower, ValidationResult } from '@/utils/formValidation';

// Modal component for confirming delegation
const DelegationConfirmModal = ({ 
  delegateData, 
  onConfirm, 
  onCancel, 
  isProcessing 
}: { 
  delegateData: { address: string; name?: string } | null, 
  onConfirm: () => void, 
  onCancel: () => void,
  isProcessing: boolean
}) => {
  if (!delegateData) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full">
        <h3 className="text-xl font-semibold text-white mb-4">Confirm Delegation</h3>
        <p className="text-gray-300 mb-4">
          You are about to delegate your voting power to:
        </p>
        <div className="bg-gray-800 p-4 rounded-lg mb-6">
          {delegateData.name && (
            <p className="text-white font-medium mb-1">{delegateData.name}</p>
          )}
          <p className="text-indigo-400 font-mono text-sm break-all">{delegateData.address}</p>
        </div>
        <p className="text-yellow-400 text-sm mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          This delegate will be able to vote on your behalf. You can revoke this delegation at any time from your profile.
        </p>
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </div>
            ) : (
              "Confirm Delegation"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper function to shorten address
const shortenAddress = (address: string) => {
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

export default function DelegatesPage() {
  const { user } = useAuth();
  const [delegates, setDelegates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userVotingPower, setUserVotingPower] = useState<string>('0');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // State for confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingDelegation, setPendingDelegation] = useState<{ address: string; name?: string } | null>(null);

  const fetchDelegates = async () => {
    try {
      setLoading(true);
      logger.debug('Fetching delegates from blockchain');
      const delegateList = await getAllDelegates();
      setDelegates(delegateList);
      logger.debug(`Fetched ${delegateList.length} delegates`);
      
      // Fetch user voting power if they're connected
      if (user?.walletAddress) {
        try {
          const power = await getVotingPower(user.walletAddress);
          setUserVotingPower(power);
          logger.debug('Fetched user voting power', { votingPower: power });
        } catch (error) {
          logger.error('Error fetching user voting power', error);
        }
      }
    } catch (error) {
      logger.error('Error fetching delegates', error);
      toast.error('Failed to fetch delegates. Please try again later.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDelegates();
  }, [user?.walletAddress]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDelegates();
    toast.success('Refreshing delegate list...');
  };

  // Validate before showing confirmation modal
  const validateDelegation = (delegateAddress: string): { isValid: boolean; errorMessage: string } => {
    // Check if user is connected
    if (!user?.walletAddress) {
      return { isValid: false, errorMessage: 'Please connect your wallet to delegate votes' };
    }
    
    // Validate the address format
    const addressValidation = validateEthereumAddress(delegateAddress, {
      allowEmpty: false, 
      allowZeroAddress: false,
      userAddress: user.walletAddress,
      allowSelfDelegation: false
    });
    
    if (!addressValidation.isValid) {
      return addressValidation;
    }
    
    // Validate voting power
    const votingPowerValidation = validateVotingPower(userVotingPower);
    if (!votingPowerValidation.isValid) {
      return votingPowerValidation;
    }
    
    return { isValid: true, errorMessage: '' };
  };

  const initiateDelegation = (delegate: any) => {
    // Validate before showing confirmation
    const validation = validateDelegation(delegate.address);
    if (!validation.isValid) {
      toast.error(validation.errorMessage);
      return;
    }
    
    // If valid, show confirmation modal
    setPendingDelegation({
      address: delegate.address,
      name: delegate.name
    });
    setShowConfirmModal(true);
  };

  const handleDelegateVotes = async () => {
    if (!pendingDelegation || !user?.walletAddress) return;
    
    try {
      setIsProcessing(true);
      await delegateVotes(pendingDelegation.address);
      toast.success('Successfully delegated votes');
      
      // Close modal and reset state
      setShowConfirmModal(false);
      setPendingDelegation(null);
      
      // Show next steps
      toast.success('Visit your profile to view or manage your delegation', {
        duration: 5000
      });
    } catch (error: any) {
      logger.error('Error delegating votes:', error);
      
      // Show specific error message based on error type
      if (error instanceof ContractServiceError) {
        switch (error.type) {
          case ContractErrorType.PROVIDER_NOT_FOUND:
            toast.error('Please install MetaMask or use a compatible browser');
            break;
          case ContractErrorType.USER_REJECTED:
            toast.error('Transaction was rejected. Please try again');
            break;
          case ContractErrorType.INVALID_ADDRESS:
            toast.error(error.message || 'Invalid address format');
            break;
          case ContractErrorType.INSUFFICIENT_FUNDS:
            toast.error('You need tokens to delegate votes. Please acquire some tokens first');
            break;
          default:
            toast.error(error.message || 'Failed to delegate votes');
        }
      } else {
        toast.error('Failed to delegate votes. Please try again later');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Active Delegates</h1>
        <button
          onClick={handleRefresh}
          disabled={loading || refreshing}
          className="bg-gray-800 hover:bg-gray-700 text-indigo-400 hover:text-indigo-300 text-sm px-3 py-2 rounded-md flex items-center transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {refreshing ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Refreshing...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </>
          )}
        </button>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        </div>
      ) : delegates.length === 0 ? (
        <div className="bg-gray-900 rounded-lg p-8 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h2 className="text-xl font-semibold text-white mb-2">No Active Delegates Found</h2>
          <p className="text-gray-400 max-w-md mx-auto">There are currently no active delegates in the system. Check back later or be the first to participate in delegation.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {delegates.map((delegate, index) => (
              <div key={index} className="bg-gray-900 rounded-lg p-6 hover:bg-gray-800 transition">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      {delegate.name || 'Anonymous Delegate'}
                    </h2>
                    <p className="text-indigo-400 font-mono text-xs break-all">
                      {shortenAddress(delegate.address)}
                    </p>
                  </div>
                  <span className="bg-indigo-900/50 text-indigo-300 text-xs py-1 px-2 rounded-full">
                    {parseFloat(delegate.votingPower).toLocaleString()} votes
                  </span>
                </div>
                
                {delegate.bio && (
                  <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                    {delegate.bio}
                  </p>
                )}
                
                <div className="border-t border-gray-800 pt-4 mt-auto">
                  <button
                    onClick={() => initiateDelegation(delegate)}
                    disabled={!user?.walletAddress || parseFloat(userVotingPower) <= 0}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Delegate Votes
                  </button>
                  
                  {(!user?.walletAddress || parseFloat(userVotingPower) <= 0) && (
                    <p className="mt-2 text-amber-400 text-xs">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 inline-block mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {!user?.walletAddress ? 'Connect wallet to delegate' : 'You need tokens to delegate'}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-8 bg-gray-900 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">What are Delegates?</h2>
            <p className="text-gray-400 mb-3">
              Delegates are active participants in our DAO's governance who have been entrusted with voting power by other token holders. They help to guide important decisions within the protocol.
            </p>
            <p className="text-gray-400 mb-3">
              By delegating your voting power to a delegate, you're allowing them to vote on your behalf in governance proposals. You can revoke this delegation at any time.
            </p>
            <p className="text-gray-400">
              Want to become a delegate? Simply acquire voting tokens, participate actively in governance, and others may choose to delegate their votes to you.
            </p>
          </div>
        </>
      )}
      
      {showConfirmModal && (
        <DelegationConfirmModal
          delegateData={pendingDelegation}
          onConfirm={handleDelegateVotes}
          onCancel={() => {
            setShowConfirmModal(false);
            setPendingDelegation(null);
          }}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
} 