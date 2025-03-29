'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getProposals, getTokenBalance, castVote, executeProposal, cancelProposal, expireProposal } from '@/services/contractService';
import { getProposalFromFirebase } from '@/services/firebaseService';
import { ProposalState, VoteType } from '@/lib/contractConfig';
import { toast } from 'react-hot-toast';
import ConnectWallet from '@/components/wallet/ConnectWallet';
import VotingInterface from '@/components/VotingInterface';
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
  const [isExpiring, setIsExpiring] = useState(false);
  
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
          // Combine the blockchain data with Firebase metadata
          proposal.metadata = metadata.metadata || {};
          proposal.title = metadata.title || proposal.title; 
          proposal.description = metadata.description || proposal.description;
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
  
  const handleExecuteProposal = async () => {
    if (!proposal || !user?.walletAddress) {
      toast.error('Please connect your wallet first');
      return;
    }
    
    if (proposal.state !== ProposalState.Succeeded) {
      toast.error('This proposal cannot be executed');
      return;
    }
    
    if (proposal.isExpired) {
      toast.error('This proposal has expired and cannot be executed');
      return;
    }
    
    setIsExecuting(true);
    try {
      const success = await executeProposal(proposalId);
      
      if (success) {
        toast.success('Proposal executed successfully!');
        // Refresh proposal data
        await fetchProposal();
      }
    } catch (error: any) {
      console.error('Error executing proposal:', error);
      toast.error(`Failed to execute proposal: ${error.message || 'Unknown error'}`);
    } finally {
      setIsExecuting(false);
    }
  };
  
  const handleExpireProposal = async () => {
    if (!proposal || !user?.walletAddress) {
      toast.error('Please connect your wallet first');
      return;
    }
    
    if (proposal.state !== ProposalState.Succeeded || !proposal.isExpired) {
      toast.error('This proposal is not eligible for expiration');
      return;
    }
    
    setIsExpiring(true);
    try {
      const success = await expireProposal(proposalId);
      
      if (success) {
        toast.success('Proposal marked as expired');
        // Refresh proposal data
        await fetchProposal();
      }
    } catch (error: any) {
      console.error('Error expiring proposal:', error);
      toast.error(`Failed to expire proposal: ${error.message || 'Unknown error'}`);
    } finally {
      setIsExpiring(false);
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
    // Handle multiple choice votes (values 4+)
    if (voteType >= 4 && proposal?.metadata?.proposalType === 'multiple-choice' && proposal?.metadata?.options) {
      const optionIndex = voteType - 4;
      if (optionIndex >= 0 && optionIndex < proposal.metadata.options.length) {
        return `Option: ${proposal.metadata.options[optionIndex]}`;
      }
      return `Option ${optionIndex + 1}`;
    }
    
    // Handle standard votes
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
  
  // Check if proposal is multiple choice
  const isMultipleChoice = () => {
    return proposal?.metadata?.proposalType === 'multiple-choice';
  };
  
  // Get multiple choice options
  const getOptions = () => {
    return proposal?.metadata?.options || [];
  };
  
  // Render voting results for multiple choice proposals
  const renderMultipleChoiceResults = () => {
    if (!isMultipleChoice() || !proposal?.metadata?.options) return null;
    
    const options = proposal.metadata.options;
    const totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
    
    // In a real implementation, you would have individual vote counts for each option
    // Here we're simulating by proportionally distributing the forVotes among options
    
    return (
      <div className="mt-6 mb-8">
        <h3 className="text-lg font-semibold text-white mb-3">Voting Results</h3>
        <div className="space-y-3">
          {options.map((option: string, index: number) => {
            // For demonstration - in reality this would come from contract data
            const optionVotes = index === 0 
              ? proposal.forVotes * 0.6  // First option gets 60% of "for" votes
              : index === 1 
                ? proposal.forVotes * 0.3  // Second option gets 30% of "for" votes
                : proposal.forVotes * 0.1 / (options.length - 2);  // Rest share 10%
            
            const percentage = totalVotes > 0 ? (optionVotes / totalVotes) * 100 : 0;
            
            return (
              <div key={index} className="bg-gray-800 rounded-lg p-3">
                <div className="flex justify-between mb-1">
                  <span className="text-white">{option}</span>
                  <span className="text-indigo-400 font-medium">{formatVotes(optionVotes)} votes</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                  <div 
                    className="bg-indigo-600 h-2.5 rounded-full" 
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <div className="text-right mt-1 text-xs text-gray-400">
                  {percentage.toFixed(1)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Handle successful vote
  const handleVoteSuccess = () => {
    toast.success('Vote cast successfully!');
    fetchProposal(); // Refresh proposal data
  };

  // Get the remaining time or execution deadline for succeeded proposals
  const getTimeInfo = (proposal: any) => {
    if (proposal.state === ProposalState.Active) {
      return getRemainingTime(proposal.endTime);
    } else if (proposal.state === ProposalState.Succeeded && !proposal.isExpired) {
      // Calculate the execution deadline (7 days after voting ends)
      const executionDeadline = new Date(proposal.endTime);
      executionDeadline.setDate(executionDeadline.getDate() + 7);
      
      const now = new Date();
      const timeDiff = executionDeadline.getTime() - now.getTime();
      
      if (timeDiff <= 0) {
        return 'Execution deadline passed';
      }
      
      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      return `Execution deadline: ${days}d ${hours}h remaining`;
    } else {
      return `Ended ${new Date(proposal.endTime).toLocaleDateString()}`;
    }
  };

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-8 min-h-screen">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container mx-auto px-4 py-8 min-h-screen">
        <div className="bg-red-900/30 border border-red-500 p-4 rounded-lg text-center">
          <h2 className="text-xl font-bold text-white mb-2">Error</h2>
          <p className="text-red-200">{error}</p>
          <button 
            onClick={() => router.push('/proposals')}
            className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
          >
            Back to Proposals
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <Link href="/proposals" className="flex items-center text-indigo-400 hover:text-indigo-300">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Proposals
        </Link>
        
        <div>
          {!user ? (
            <ConnectWallet />
          ) : null}
        </div>
      </div>
      
      {tokenBalance && (
        <div className="mb-6 p-3 bg-gray-800 rounded text-gray-300">
          <p>Your voting power: <span className="font-semibold text-green-400">{parseFloat(tokenBalance).toFixed(2)} GOV</span></p>
        </div>
      )}

      {proposal ? (
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
            
            {/* Proposal Type Badge */}
            {isMultipleChoice() && (
              <div className="inline-block bg-indigo-900/30 border border-indigo-500 px-3 py-1 rounded-full mb-6">
                <p className="text-indigo-300 text-sm font-medium">Multiple Choice Proposal</p>
              </div>
            )}
            
            <div className="border-b border-gray-800 mb-6 pb-6">
              <p className="text-gray-300 whitespace-pre-line">{proposal.description}</p>
              
              {/* Multiple Choice Options */}
              {isMultipleChoice() && getOptions().length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Options</h3>
                  <ul className="space-y-2 list-disc pl-5">
                    {getOptions().map((option: string, index: number) => (
                      <li key={index} className="text-gray-300">{option}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            {isMultipleChoice() ? (
              renderMultipleChoiceResults()
            ) : (
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
            )}
            
            {/* User Already Voted */}
            {proposal.hasVoted && (
              <div className="mb-6 p-4 bg-indigo-900/30 rounded-lg">
                <div className="flex items-center text-indigo-400 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <h3 className="text-lg font-semibold">You already voted</h3>
                </div>
                <p className="text-gray-300">
                  You voted: <span className="font-medium">{getUserVoteTypeText(proposal.userVote)}</span> with {formatVotes(proposal.userVoteWeight)} voting power
                </p>
              </div>
            )}
            
            {/* Voting Interface */}
            {proposal.state === ProposalState.Active && !proposal.hasVoted && (
              <div className="mb-6">
                <VotingInterface 
                  proposalId={proposalId.toString()}
                  proposalState={getProposalStateText(proposal.state)}
                  endTime={proposal.endTime}
                  hasUserVoted={proposal.hasVoted}
                  onVoteSuccess={handleVoteSuccess}
                  proposalType={isMultipleChoice() ? 'multiple-choice' : 'standard'}
                  options={getOptions()}
                />
              </div>
            )}
            
            {/* Proposer Info */}
            <div className="border-t border-gray-800 pt-6">
              <p className="text-gray-400 text-sm">
                Proposed by: <span className="font-mono text-indigo-400">{proposal.proposer}</span>
              </p>
            </div>
            
            {/* Update the status banners to include expiration info */}
            {proposal.state === ProposalState.Succeeded && !proposal.isExpired && (
              <div className="bg-green-900/30 border border-green-500 p-3 rounded-lg mb-6">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-green-300 font-medium">This proposal has passed and is ready for execution!</p>
                    <p className="text-green-400/70 text-sm mt-1">{getTimeInfo(proposal)}</p>
                  </div>
                </div>
              </div>
            )}
            
            {proposal.state === ProposalState.Succeeded && proposal.isExpired && (
              <div className="bg-yellow-900/30 border border-yellow-500 p-3 rounded-lg mb-6">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-yellow-300 font-medium">This proposal has expired!</p>
                    <p className="text-yellow-400/70 text-sm mt-1">The execution deadline has passed.</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Add execution button for passed proposals */}
            {proposal.state === ProposalState.Succeeded && !proposal.isExpired && (
              <div className="border-t border-gray-800 pt-6 mt-6">
                <h3 className="text-lg font-semibold text-white mb-4">Proposal Execution</h3>
                <p className="text-gray-300 mb-4">
                  This proposal has been approved by the community and is ready to be executed.
                  Execute this proposal to implement its changes on-chain.
                </p>
                <button
                  onClick={handleExecuteProposal}
                  disabled={isExecuting}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded transition disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                >
                  {isExecuting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Executing Proposal...
                    </>
                  ) : (
                    'Execute Proposal'
                  )}
                </button>
              </div>
            )}
            
            {proposal.state === ProposalState.Succeeded && proposal.isExpired && (
              <div className="border-t border-gray-800 pt-6 mt-6">
                <h3 className="text-lg font-semibold text-white mb-4">Proposal Expired</h3>
                <p className="text-gray-300 mb-4">
                  This proposal has been approved but the execution deadline has passed.
                  Mark it as expired to update its status.
                </p>
                <button
                  onClick={handleExpireProposal}
                  disabled={isExpiring}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-3 px-4 rounded transition disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                >
                  {isExpiring ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Marking as Expired...
                    </>
                  ) : (
                    'Mark as Expired'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-gray-400">No proposal data available</p>
        </div>
      )}
    </main>
  );
} 