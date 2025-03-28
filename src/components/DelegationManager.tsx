'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  delegateVotes, 
  undelegate, 
  getDelegationStatus, 
  getVotingPower,
  getDelegationsToAddress,
  ContractServiceError,
  ContractErrorType
} from '@/services/contractService';
import { toast } from 'react-hot-toast';
import { ethers } from 'ethers';
import Link from 'next/link';
import { logger } from '@/utils/logger';
import { validateEthereumAddress, validateVotingPower } from '@/utils/formValidation';

// Helper function to get user-friendly error message
const getErrorMessage = (error: any): string => {
  if (error instanceof ContractServiceError) {
    return error.message;
  }
  
  // Fallback to default message or error message
  return error?.message || 'An unknown error occurred';
};

const DelegationManager = () => {
  const { user } = useAuth();
  const [delegateAddress, setDelegateAddress] = useState('');
  const [currentDelegatee, setCurrentDelegatee] = useState<string | null>(null);
  const [hasDelegated, setHasDelegated] = useState(false);
  const [votingPower, setVotingPower] = useState('0');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [receivedDelegations, setReceivedDelegations] = useState<{ address: string; votingPower: string }[]>([]);
  
  // Form validation
  const [validationError, setValidationError] = useState<string | null>(null);
  const [touchedFields, setTouchedFields] = useState({
    delegateAddress: false
  });

  const fetchDelegationStatus = async () => {
    if (!user?.walletAddress) return;
    
    try {
      setIsLoading(true);
      const { hasDelegated, delegatee } = await getDelegationStatus(user.walletAddress);
      setHasDelegated(hasDelegated);
      setCurrentDelegatee(delegatee);
      
      // Get voting power
      const power = await getVotingPower(user.walletAddress);
      setVotingPower(power);
      
      // Get list of users who delegated to this address
      let delegators: { address: string; votingPower: string }[] = [];
      if (user.walletAddress) {
        delegators = await getDelegationsToAddress(user.walletAddress);
        setReceivedDelegations(delegators);
      }
      
      logger.debug('Delegation status fetched', { 
        hasDelegated, 
        delegatee, 
        votingPower: power,
        receivedDelegationsCount: delegators?.length || 0
      });
    } catch (error) {
      logger.error('Error fetching delegation status:', error);
      toast.error(getErrorMessage(error) || 'Failed to fetch delegation status');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDelegationStatus();
  }, [user]);

  // Validation logic using the utility functions
  const validateDelegateAddress = (address: string): string | null => {
    const { isValid, errorMessage } = validateEthereumAddress(address, {
      allowEmpty: false,
      allowZeroAddress: false,
      userAddress: user?.walletAddress,
      allowSelfDelegation: false
    });

    return isValid ? null : errorMessage;
  };

  // When address field changes, validate it
  useEffect(() => {
    if (touchedFields.delegateAddress) {
      setValidationError(validateDelegateAddress(delegateAddress));
    }
  }, [delegateAddress, touchedFields.delegateAddress, user?.walletAddress]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDelegationStatus();
    toast.success('Refreshing delegation status...');
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDelegateAddress(e.target.value);
    setTouchedFields(prev => ({ ...prev, delegateAddress: true }));
  };

  const handleAddressBlur = () => {
    setTouchedFields(prev => ({ ...prev, delegateAddress: true }));
  };

  const handleDelegate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form on submission
    const addressError = validateDelegateAddress(delegateAddress);
    setValidationError(addressError);
    setTouchedFields({ delegateAddress: true });
    
    if (addressError) {
      toast.error(addressError);
      return;
    }
    
    // Validate voting power
    const votingPowerValidation = validateVotingPower(votingPower);
    if (!votingPowerValidation.isValid) {
      toast.error(votingPowerValidation.errorMessage || 'Insufficient voting power');
      return;
    }

    try {
      setIsProcessing(true);
      
      // Input validation is now handled by the service function
      await delegateVotes(delegateAddress);
      toast.success('Successfully delegated votes');
      
      // Refresh status
      const { hasDelegated, delegatee } = await getDelegationStatus(user?.walletAddress || '');
      setHasDelegated(hasDelegated);
      setCurrentDelegatee(delegatee);
      setDelegateAddress('');
      setValidationError(null);
      setTouchedFields({ delegateAddress: false });
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

  const handleUndelegate = async () => {
    // Add confirmation to prevent accidental undelegation
    if (!confirm('Are you sure you want to remove your vote delegation? This will return your voting power to your own address.')) {
      return;
    }
    
    try {
      setIsProcessing(true);
      await undelegate();
      toast.success('Successfully undelegated votes');
      
      // Refresh status
      setHasDelegated(false);
      setCurrentDelegatee(null);
      
      // Get updated voting power
      if (user?.walletAddress) {
        try {
          const power = await getVotingPower(user.walletAddress);
          setVotingPower(power);
        } catch (error) {
          logger.warn('Error updating voting power:', error);
        }
      }
    } catch (error: any) {
      logger.error('Error undelegating votes:', error);
      
      // Show specific error message based on error type
      if (error instanceof ContractServiceError) {
        switch (error.type) {
          case ContractErrorType.PROVIDER_NOT_FOUND:
            toast.error('Please install MetaMask or use a compatible browser');
            break;
          case ContractErrorType.USER_REJECTED:
            toast.error('Transaction was rejected. Please try again');
            break;
          case ContractErrorType.CONTRACT_ERROR:
            toast.error(error.message || 'Contract error. You may not have delegated your votes');
            break;
          default:
            toast.error(error.message || 'Failed to undelegate votes');
        }
      } else {
        toast.error('Failed to undelegate votes. Please try again later');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Add helper function to shorten addresses
  const shortenAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  if (!user?.walletAddress) {
    return (
      <div className="bg-gray-900 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 text-white">Vote Delegation</h2>
        <p className="text-gray-400">Please connect your wallet to manage vote delegation.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-white">Vote Delegation</h2>
        <button
          onClick={handleRefresh}
          disabled={isLoading || refreshing}
          className="bg-gray-800 hover:bg-gray-700 text-indigo-400 hover:text-indigo-300 text-sm px-3 py-1 rounded-md flex items-center transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {refreshing ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Refreshing...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </>
          )}
        </button>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <p className="text-gray-400 text-sm">Your Voting Power</p>
            <p className="text-white font-bold">{parseFloat(votingPower).toFixed(2)} votes</p>
          </div>
          
          {hasDelegated && currentDelegatee ? (
            <div className="mb-6">
              <div className="bg-indigo-900/30 p-4 rounded-lg mb-4">
                <p className="text-gray-300 text-sm mb-1">Currently delegated to:</p>
                <div className="flex items-center space-x-2">
                  <div className="bg-indigo-900/50 rounded-full h-8 w-8 flex items-center justify-center text-indigo-300 text-xs">
                    {currentDelegatee.substring(2, 4).toUpperCase()}
                  </div>
                  <p className="text-indigo-300 font-mono break-all">{currentDelegatee}</p>
                </div>
                
                <div className="mt-2 pt-2 border-t border-indigo-900/50">
                  <Link
                    href={`https://sepolia.etherscan.io/address/${currentDelegatee}`}
                    target="_blank"
                    rel="noopener noreferrer" 
                    className="text-indigo-400 hover:text-indigo-300 text-xs flex items-center w-fit"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    View on Etherscan
                  </Link>
                </div>
              </div>
              
              <button
                onClick={handleUndelegate}
                disabled={isProcessing}
                className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Processing...' : 'Remove Delegation'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleDelegate} className="space-y-4">
              <div>
                <label htmlFor="delegateAddress" className="block text-sm font-medium text-gray-300 mb-1">
                  Delegate Address
                </label>
                <input
                  type="text"
                  id="delegateAddress"
                  value={delegateAddress}
                  onChange={handleAddressChange}
                  onBlur={handleAddressBlur}
                  placeholder="0x..."
                  className={`w-full bg-gray-800 text-white p-3 rounded-md border ${
                    validationError && touchedFields.delegateAddress 
                      ? 'border-red-500 focus:border-red-500 focus:ring focus:ring-red-500/20' 
                      : 'border-gray-700 focus:border-indigo-500 focus:ring focus:ring-indigo-500/20'
                  } focus:outline-none font-mono`}
                  required
                  aria-invalid={validationError ? 'true' : 'false'}
                  aria-describedby="delegateAddress-error"
                />
                {validationError && touchedFields.delegateAddress && (
                  <p id="delegateAddress-error" className="mt-1 text-sm text-red-500">
                    {validationError}
                  </p>
                )}
                {!validationError && (
                  <p className="mt-1 text-sm text-gray-400">
                    Enter the address of the wallet you want to delegate your voting power to.
                  </p>
                )}
              </div>
              
              {parseFloat(votingPower) <= 0 && (
                <div className="bg-amber-900/30 p-3 rounded-md text-amber-400 text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  You don't have any voting power. Please acquire some tokens first.
                </div>
              )}
              
              <button
                type="submit"
                disabled={isProcessing || !!validationError || parseFloat(votingPower) <= 0}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Processing...' : 'Delegate Votes'}
              </button>
            </form>
          )}
          
          <div className="mt-6 pt-4 border-t border-gray-800">
            <h3 className="text-md font-medium text-white mb-2">What is vote delegation?</h3>
            <p className="text-gray-400 text-sm mb-4">
              Vote delegation allows you to assign your voting power to another address without transferring your tokens.
              The delegatee will be able to vote with the combined voting power in governance proposals.
              You can remove this delegation at any time.
            </p>
            <Link 
              href="/delegates" 
              className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center w-fit"
            >
              <span>Browse active delegates</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
          
          {!isLoading && receivedDelegations.length > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-800">
              <h3 className="text-lg font-medium text-white mb-4">Delegations Received</h3>
              <p className="text-gray-400 text-sm mb-4">
                The following addresses have delegated their voting power to you:
              </p>
              
              <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                {receivedDelegations.map((delegator) => (
                  <div key={delegator.address} className="flex justify-between items-center bg-gray-800/60 p-3 rounded-md">
                    <div>
                      <div className="text-sm text-gray-300 font-mono">
                        {shortenAddress(delegator.address)}
                      </div>
                    </div>
                    <div className="text-sm text-indigo-400">
                      {parseFloat(delegator.votingPower).toFixed(2)} votes
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-3 text-sm text-gray-400 italic">
                Total received voting power: {
                  receivedDelegations.reduce((total, current) => total + parseFloat(current.votingPower), 0).toFixed(2)
                } votes
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DelegationManager; 