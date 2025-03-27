'use client';

import { useState } from 'react';
import { Proposal } from '@/lib/contractConfig';
import { voteOnProposal, closeExpiredProposal } from '@/services/contractService';

interface ProposalCardProps {
  proposal: Proposal;
  onVoteSuccess: () => void;
}

const ProposalCard = ({ proposal, onVoteSuccess }: ProposalCardProps) => {
  const [isVoting, setIsVoting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isExpired = new Date() > proposal.deadline;

  const handleVote = async () => {
    if (proposal.hasVoted) {
      setError('You have already voted on this proposal');
      return;
    }

    if (!proposal.active) {
      setError('This proposal is no longer active');
      return;
    }

    if (isExpired) {
      setError('The voting period has ended');
      return;
    }

    try {
      setIsVoting(true);
      setError(null);
      await voteOnProposal(proposal.id);
      onVoteSuccess();
    } catch (error: any) {
      setError(error.message || 'Failed to vote on proposal');
    } finally {
      setIsVoting(false);
    }
  };

  const handleClose = async () => {
    if (!proposal.active) {
      setError('This proposal is already closed');
      return;
    }

    if (!isExpired) {
      setError('Cannot close an active proposal before deadline');
      return;
    }

    try {
      setIsClosing(true);
      setError(null);
      await closeExpiredProposal(proposal.id);
      onVoteSuccess();
    } catch (error: any) {
      setError(error.message || 'Failed to close proposal');
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <div className="dark-card rounded-lg shadow-md overflow-hidden">
      <div className="p-5">
        <div className="flex justify-between items-start">
          <h3 className="text-xl font-bold text-white mb-2">{proposal.title}</h3>
          <div className="flex flex-col items-end">
            {proposal.active ? (
              <span className="bg-green-900 text-green-300 text-xs font-medium px-2.5 py-0.5 rounded">
                Active
              </span>
            ) : (
              <span className="bg-red-900 text-red-300 text-xs font-medium px-2.5 py-0.5 rounded">
                Closed
              </span>
            )}
            <span className="text-sm text-gray-400 mt-1">
              Votes: {proposal.voteCount}
            </span>
          </div>
        </div>
        
        <p className="text-gray-300 mb-4">{proposal.description}</p>
        
        <div className="flex justify-between items-center text-sm text-gray-400">
          <span>
            Deadline: {formatDate(proposal.deadline)}
          </span>
          {proposal.hasVoted && (
            <span className="text-blue-400 font-medium">You voted</span>
          )}
        </div>
        
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        
        <div className="mt-4 flex justify-between">
          <button
            onClick={handleVote}
            disabled={isVoting || proposal.hasVoted || !proposal.active || isExpired}
            className={`py-2 px-4 rounded-lg transition-colors flex-1 mr-2 ${
              isVoting || proposal.hasVoted || !proposal.active || isExpired
                ? 'dark-button-disabled'
                : 'dark-button-primary'
            }`}
          >
            {isVoting ? 'Voting...' : proposal.hasVoted ? 'Voted' : 'Vote'}
          </button>
          
          {isExpired && proposal.active && (
            <button
              onClick={handleClose}
              disabled={isClosing || !isExpired}
              className={`py-2 px-4 rounded-lg transition-colors flex-1 ml-2 ${
                isClosing ? 'dark-button-disabled' : 'dark-button-danger'
              }`}
            >
              {isClosing ? 'Closing...' : 'Close Proposal'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProposalCard; 