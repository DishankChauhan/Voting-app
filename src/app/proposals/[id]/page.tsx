'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getProposals, getTokenBalance, castVote, executeProposal, cancelProposal } from '@/services/contractService';
import { getProposalFromFirebase } from '@/services/firebaseService';
import { ProposalState, VoteType } from '@/lib/contractConfig';
import { toast } from 'react-hot-toast';
import ConnectWallet from '@/components/wallet/ConnectWallet';
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

export default function ProposalDetail({ params }: { params: { id: string } }) {
  const proposalId = parseInt(params.id);
  const router = useRouter();
  const { user } = useAuth();
  
  const [proposal, setProposal] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<string | null>(null);
  
  const [voteType, setVoteType] = useState<VoteType>(VoteType.For);
  const [isVoting, setIsVoting] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  
  useEffect(() => {
    fetchProposal();
    
    if (user && user.walletAddress) {
      fetchTokenBalance();
    }
  }, [user, proposalId]);
  
  const fetchProposal = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      logger.debug(`Fetching proposal ${proposalId}...`);
      
      const proposals = await getProposals();
      const proposal = proposals.find(p => p.id === proposalId);
      
      if (!proposal) {
        setError(`Proposal with ID ${proposalId} not found`);
        setIsLoading(false);
        return;
      }
      
      // Get additional metadata from Firebase
      try {
        const metadata = await getProposalFromFirebase(proposalId);
        if (metadata) {
          proposal.metadata = metadata;
        }
      } catch (metadataError) {
        console.error('Error fetching proposal metadata:', metadataError);
      }
      
      setProposal(proposal);
    } catch (error: any) {
      console.error(`Error fetching proposal ${proposalId}:`, error);
      setError(error.message || 'Failed to fetch proposal');
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
  
  const handleVote = async () => {
    if (!proposal || !user?.walletAddress) {
      toast.error('Please connect your wallet first');
      return;
    }
    
    if (proposal.state !== ProposalState.Active) {
      if (proposal.state === ProposalState.Pending) {
        toast.error('This proposal is still pending and not yet active for voting');
      } else {
        toast.error('This proposal is not active for voting');
      }
      return;
    }
    
    if (proposal.hasVoted) {
      toast.error('You have already voted on this proposal');
      return;
    }
    
    setIsVoting(true);
    try {
      await castVote(proposalId, voteType);
      toast.success('Vote cast successfully!');
      fetchProposal(); // Refresh proposal data
    } catch (error: any) {
      console.error('Error casting vote:', error);
      toast.error(`Failed to cast vote: ${error.message || 'Unknown error'}`);
    } finally {
      setIsVoting(false);
    }
  };
  
  const handleExecute = async () => {
    if (!proposal || !user?.walletAddress) {
      toast.error('Please connect your wallet first');
      return;
    }
    
    if (proposal.state !== ProposalState.Succeeded) {
      toast.error('This proposal cannot be executed');
      return;
    }
    
    setIsExecuting(true);
    try {
      await executeProposal(proposalId);
      toast.success('Proposal executed successfully!');
      fetchProposal(); // Refresh proposal data
    } catch (error: any) {
      console.error('Error executing proposal:', error);
      toast.error(`Failed to execute proposal: ${error.message || 'Unknown error'}`);
    } finally {
      setIsExecuting(false);
    }
  };
  
  const handleCancel = async () => {
    if (!proposal || !user?.walletAddress) {
      toast.error('Please connect your wallet first');
      return;
    }
    
    if (proposal.state !== ProposalState.Active && proposal.state !== ProposalState.Pending) {
      toast.error('This proposal cannot be canceled');
      return;
    }
    
    // TODO: Check if user is the proposer
    
    setIsCanceling(true);
    try {
      await cancelProposal(proposalId);
      toast.success('Proposal canceled successfully!');
      fetchProposal(); // Refresh proposal data
    } catch (error: any) {
      console.error('Error canceling proposal:', error);
      toast.error(`Failed to cancel proposal: ${error.message || 'Unknown error'}`);
    } finally {
      setIsCanceling(false);
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
  
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="container mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <Link href="/proposals" className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Proposals
          </Link>
          <div className="flex items-center space-x-4">
            <ConnectWallet />
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-900/30 rounded-lg p-6 text-center my-8">
            <h3 className="text-lg font-semibold text-red-400 mb-4">{error}</h3>
            <p className="text-gray-300 mb-6">
              Unable to load proposal. Make sure your wallet is connected and you're on the correct network.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => router.push('/proposals')}
                className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-6 rounded transition"
              >
                Go Back
              </button>
              <button
                onClick={fetchProposal}
                className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-6 rounded transition"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : proposal ? (
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-900 rounded-lg p-6 shadow-lg">
              <div className="flex justify-between items-start mb-4">
                <h1 className="text-2xl md:text-3xl font-bold text-white">{proposal.title}</h1>
                <span className={`text-xs font-semibold px-2 py-1 rounded text-white ${getStateClass(proposal.state)}`}>
                  {getProposalStateText(proposal.state)}
                </span>
              </div>
              
              <div className="flex items-center text-gray-400 text-sm mb-6">
                <span className="mr-4">
                  {proposal.state === ProposalState.Active 
                    ? getRemainingTime(proposal.endTime)
                    : `Ended ${new Date(proposal.endTime).toLocaleDateString()}`
                  }
                </span>
                <span>Created {new Date(proposal.startTime).toLocaleDateString()}</span>
              </div>
              
              {/* Status Banner */}
              {proposal.state === ProposalState.Active && (
                <div className="bg-blue-900/30 border border-blue-500 p-3 rounded-lg mb-6">
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <p className="text-blue-300 font-medium">This proposal is open for voting!</p>
                  </div>
                </div>
              )}
              
              {proposal.state === ProposalState.Pending && (
                <div className="bg-purple-900/30 border border-purple-500 p-3 rounded-lg mb-6">
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    <p className="text-purple-300 font-medium">This proposal is pending and not yet open for voting</p>
                  </div>
                </div>
              )}
              
              <div className="border-b border-gray-800 mb-6 pb-6">
                <p className="text-gray-300 whitespace-pre-line">{proposal.description}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-green-900/30 p-4 rounded text-center">
                  <p className="text-sm text-gray-400 mb-2">For</p>
                  <p className="text-2xl font-semibold text-green-400">
                    {formatVotes(proposal.forVotes)}
                  </p>
                </div>
                <div className="bg-red-900/30 p-4 rounded text-center">
                  <p className="text-sm text-gray-400 mb-2">Against</p>
                  <p className="text-2xl font-semibold text-red-400">
                    {formatVotes(proposal.againstVotes)}
                  </p>
                </div>
                <div className="bg-gray-700/30 p-4 rounded text-center">
                  <p className="text-sm text-gray-400 mb-2">Abstain</p>
                  <p className="text-2xl font-semibold text-gray-400">
                    {formatVotes(proposal.abstainVotes)}
                  </p>
                </div>
              </div>
              
              {tokenBalance && (
                <div className="mb-6 p-3 bg-gray-800 rounded text-gray-300">
                  <p>Your voting power: <span className="font-semibold text-green-400">{parseFloat(tokenBalance).toFixed(2)} GOV</span></p>
                </div>
              )}
              
              {proposal.hasVoted ? (
                <div className="bg-indigo-900/30 p-4 rounded text-center mb-6">
                  <p className="text-indigo-300 mb-1">Your Vote</p>
                  <p className="text-xl font-semibold text-indigo-400">
                    {getUserVoteTypeText(proposal.userVote)} with {formatVotes(proposal.userVoteWeight)} voting power
                  </p>
                </div>
              ) : proposal.state === ProposalState.Active || proposal.state === ProposalState.Pending ? (
                <div className="border-t border-gray-800 pt-6 mb-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Cast Your Vote</h3>
                  
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <button
                      className={`p-4 rounded-lg text-center transition flex flex-col items-center justify-center ${
                        voteType === VoteType.For 
                          ? 'bg-green-600 text-white ring-2 ring-green-400 ring-offset-2 ring-offset-gray-900' 
                          : 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
                      }`}
                      onClick={() => setVoteType(VoteType.For)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                      For
                    </button>
                    <button
                      className={`p-4 rounded-lg text-center transition flex flex-col items-center justify-center ${
                        voteType === VoteType.Against 
                          ? 'bg-red-600 text-white ring-2 ring-red-400 ring-offset-2 ring-offset-gray-900' 
                          : 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
                      }`}
                      onClick={() => setVoteType(VoteType.Against)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      Against
                    </button>
                    <button
                      className={`p-4 rounded-lg text-center transition flex flex-col items-center justify-center ${
                        voteType === VoteType.Abstain 
                          ? 'bg-gray-600 text-white ring-2 ring-gray-400 ring-offset-2 ring-offset-gray-900' 
                          : 'bg-gray-700/30 text-gray-400 hover:bg-gray-700/50'
                      }`}
                      onClick={() => setVoteType(VoteType.Abstain)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
                      </svg>
                      Abstain
                    </button>
                  </div>
                  
                  <button
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded transition disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                    onClick={handleVote}
                    disabled={isVoting || !user?.walletAddress || proposal.state === ProposalState.Pending}
                  >
                    {isVoting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Voting...
                      </>
                    ) : !user?.walletAddress ? (
                      'Connect Wallet to Vote'
                    ) : proposal.state === ProposalState.Pending ? (
                      'Proposal is Pending - Voting Not Active Yet'
                    ) : (
                      'Cast Vote'
                    )}
                  </button>
                  
                  {proposal.state === ProposalState.Pending && (
                    <p className="text-yellow-400 text-sm mt-2 text-center">
                      This proposal is still in the pending state. Voting will be enabled once the proposal becomes active.
                    </p>
                  )}
                </div>
              ) : (
                <div className="border-t border-gray-800 pt-6 mb-6">
                  <div className="flex flex-wrap gap-4 justify-end">
                    {proposal.state === ProposalState.Succeeded && (
                      <button
                        className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded transition flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={handleExecute}
                        disabled={isExecuting || !user?.walletAddress}
                      >
                        {isExecuting ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Executing...
                          </>
                        ) : (
                          'Execute Proposal'
                        )}
                      </button>
                    )}
                    
                    {(proposal.state === ProposalState.Active || proposal.state === ProposalState.Pending) && proposal.proposer === user?.walletAddress && (
                      <button
                        className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-6 rounded transition flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={handleCancel}
                        disabled={isCanceling || !user?.walletAddress}
                      >
                        {isCanceling ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Canceling...
                          </>
                        ) : (
                          'Cancel Proposal'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-lg p-6 text-center my-8">
            <p className="text-gray-300">Proposal not found.</p>
          </div>
        )}
      </div>
    </main>
  );
} 