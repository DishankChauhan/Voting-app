'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getProposals, getTokenBalance } from '@/services/contractService';
import { getProposalFromFirebase } from '@/services/firebaseService';
import { ProposalState, VoteType } from '@/lib/contractConfig';
import { toast } from 'react-hot-toast';
import logger from '@/utils/logger';

// Helper function to return the state as a human-readable string
const getProposalStateText = (state: ProposalState) => {
  switch (state) {
    case ProposalState.Pending:
      return 'Pending';
    case ProposalState.Active:
      return 'Active';
    case ProposalState.Canceled:
      return 'Canceled';
    case ProposalState.Defeated:
      return 'Defeated';
    case ProposalState.Succeeded:
      return 'Succeeded';
    case ProposalState.Executed:
      return 'Executed';
    case ProposalState.Expired:
      return 'Expired';
    default:
      return 'Unknown';
  }
};

// Helper function to get the right CSS class for the state
const getStateClass = (state: ProposalState) => {
  switch (state) {
    case ProposalState.Active:
      return 'bg-blue-600';
    case ProposalState.Succeeded:
      return 'bg-green-600';
    case ProposalState.Executed:
      return 'bg-green-700';
    case ProposalState.Defeated:
      return 'bg-red-600';
    case ProposalState.Canceled:
      return 'bg-gray-600';
    case ProposalState.Expired:
      return 'bg-yellow-600';
    case ProposalState.Pending:
      return 'bg-purple-600';
    default:
      return 'bg-gray-600';
  }
};

// Helper function to format vote counts
const formatVotes = (voteCount: number) => {
  if (voteCount >= 1_000_000) {
    return `${(voteCount / 1_000_000).toFixed(2)}M`;
  } else if (voteCount >= 1_000) {
    return `${(voteCount / 1_000).toFixed(2)}K`;
  }
  return voteCount.toFixed(2);
};

export default function ProposalList() {
  const [proposals, setProposals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tokenBalance, setTokenBalance] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Fetch proposals when component mounts
    fetchProposals();
    
    // Fetch user's token balance if user is connected
    if (user && user.walletAddress) {
      fetchTokenBalance();
    }
  }, [user]);

  const fetchProposals = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      logger.debug('Fetching proposals...');
      
      // Check if user is connected
      if (!user || !user.walletAddress) {
        logger.debug('No wallet connected, connecting to view proposals as guest');
      } else {
        logger.debug('Fetching proposals for user:', user.walletAddress);
      }
      
      const onChainProposals = await getProposals();
      logger.debug('Proposals fetched from blockchain:', onChainProposals);
      
      if (onChainProposals.length === 0) {
        logger.debug('No proposals found on chain');
      }
      
      // Fetch additional metadata from Firebase if needed
      const proposalsWithMetadata = await Promise.all(
        onChainProposals.map(async (proposal) => {
          try {
            const metadata = await getProposalFromFirebase(proposal.id);
            return {
              ...proposal,
              metadata: metadata || {}
            };
          } catch (err) {
            logger.warn(`Failed to fetch metadata for proposal ${proposal.id}:`, err);
            return proposal;
          }
        })
      );
      
      logger.debug('Proposals with metadata:', proposalsWithMetadata);
      setProposals(proposalsWithMetadata);
    } catch (error) {
      logger.error('Error fetching proposals:', error);
      setError('Failed to load proposals. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTokenBalance = async () => {
    if (user && user.walletAddress) {
      try {
        const balance = await getTokenBalance(user.walletAddress);
        setTokenBalance(balance);
      } catch (error) {
        console.error('Error fetching token balance:', error);
      }
    }
  };

  // Calculate remaining time
  const getRemainingTime = (endTime: Date) => {
    const now = new Date();
    const timeDiff = endTime.getTime() - now.getTime();
    
    if (timeDiff <= 0) {
      return 'Ended';
    }
    
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h remaining`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  };

  // Get user's vote type as text
  const getUserVoteTypeText = (voteType: VoteType) => {
    switch (voteType) {
      case VoteType.Against:
        return 'Against';
      case VoteType.For:
        return 'For';
      case VoteType.Abstain:
        return 'Abstain';
      default:
        return 'Unknown';
    }
  };

  const handleRefresh = () => {
    fetchProposals();
    if (user && user.walletAddress) {
      fetchTokenBalance();
    }
    toast.success('Refreshing proposals...');
  };

  // Navigate to proposal detail page
  const navigateToProposal = (proposalId: number) => {
    router.push(`/proposals/${proposalId}`);
  };

  return (
    <div className="w-full">
      {tokenBalance && (
        <div className="mb-6 p-3 bg-gray-800 rounded text-gray-300">
          <p>Your voting power: <span className="font-semibold text-green-400">{parseFloat(tokenBalance).toFixed(2)} GOV</span></p>
        </div>
      )}
      
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Proposals</h2>
        <div className="flex space-x-2">
          <button 
            onClick={handleRefresh}
            className="bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded transition flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-900/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-400 mb-2">Error Loading Proposals</h3>
          <p className="text-gray-300 mb-4">{error}</p>
          <p className="text-gray-400 text-sm mb-4">
            Make sure your wallet is connected and you're on the correct network.
          </p>
          <button
            onClick={handleRefresh}
            className="bg-red-700 hover:bg-red-600 text-white font-medium py-2 px-4 rounded transition"
          >
            Try Again
          </button>
        </div>
      ) : proposals.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <p className="text-gray-400">No proposals have been created yet.</p>
          <p className="text-gray-500 mt-2">Be the first to create one!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {proposals.map((proposal) => (
            <div 
              key={proposal.id} 
              className="bg-gray-800 hover:bg-gray-750 rounded-lg p-5 cursor-pointer transition"
              onClick={() => navigateToProposal(proposal.id)}
            >
              <div className="flex justify-between items-start">
                <h3 className="text-xl font-medium text-white mb-2">{proposal.title}</h3>
                <span className={`text-xs font-semibold px-2 py-1 rounded text-white ${getStateClass(proposal.state)}`}>
                  {getProposalStateText(proposal.state)}
                </span>
              </div>
              
              <p className="text-gray-400 mb-4 line-clamp-2">{proposal.description}</p>
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-green-900/30 p-3 rounded text-center">
                  <p className="text-xs text-gray-400">For</p>
                  <p className="text-lg font-semibold text-green-400">
                    {formatVotes(proposal.forVotes)}
                  </p>
                </div>
                <div className="bg-red-900/30 p-3 rounded text-center">
                  <p className="text-xs text-gray-400">Against</p>
                  <p className="text-lg font-semibold text-red-400">
                    {formatVotes(proposal.againstVotes)}
                  </p>
                </div>
                <div className="bg-gray-700/30 p-3 rounded text-center">
                  <p className="text-xs text-gray-400">Abstain</p>
                  <p className="text-lg font-semibold text-gray-400">
                    {formatVotes(proposal.abstainVotes)}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <div className="text-gray-500">
                  {proposal.state === ProposalState.Active 
                    ? getRemainingTime(proposal.endTime)
                    : `Ended ${new Date(proposal.endTime).toLocaleDateString()}`
                  }
                </div>
                
                {proposal.hasVoted ? (
                  <div className="text-indigo-400 font-medium">
                    You voted: {getUserVoteTypeText(proposal.userVote)} with {formatVotes(proposal.userVoteWeight)} power
                  </div>
                ) : proposal.state === ProposalState.Active ? (
                  <Link
                    href={`/proposals/${proposal.id}`}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm py-1 px-4 rounded-full transition"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateToProposal(proposal.id);
                    }}
                  >
                    Vote Now
                  </Link>
                ) : proposal.state === ProposalState.Pending ? (
                  <Link
                    href={`/proposals/${proposal.id}`}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-sm py-1 px-4 rounded-full transition"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateToProposal(proposal.id);
                    }}
                  >
                    View Details
                  </Link>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 