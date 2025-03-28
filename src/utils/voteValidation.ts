import { ValidationResult } from './formValidation';
import { logger } from './logger';

/**
 * Supported vote types
 */
export enum VoteType {
  For = 1,
  Against = 0,
  Abstain = 2
}

/**
 * Vote validation result interface
 */
export interface VoteValidationResult extends ValidationResult {
  canProceed: boolean;
}

/**
 * Validate if a user can cast a vote on a proposal
 */
export function validateVoteCast(
  userVotingPower: string,
  hasVoted: boolean,
  proposalState: string
): VoteValidationResult {
  // Check if user has voting power
  const votingPower = parseFloat(userVotingPower);
  if (isNaN(votingPower) || votingPower <= 0) {
    return {
      isValid: false,
      errorMessage: 'You need tokens to vote. Please acquire some governance tokens first.',
      canProceed: false
    };
  }

  // Check if user has already voted
  if (hasVoted) {
    return {
      isValid: false,
      errorMessage: 'You have already cast a vote on this proposal.',
      canProceed: false
    };
  }

  // Check proposal state
  if (proposalState !== 'Active') {
    return {
      isValid: false,
      errorMessage: `Cannot vote on this proposal because it is currently in ${proposalState} state.`,
      canProceed: false
    };
  }

  return {
    isValid: true,
    errorMessage: '',
    canProceed: true
  };
}

/**
 * Validate if a proposal can be executed
 */
export function validateProposalExecution(
  proposalState: string,
  isProposer: boolean,
  forVotes: string,
  againstVotes: string,
  quorum: string
): VoteValidationResult {
  // Check if user is the proposer
  if (!isProposer) {
    return {
      isValid: false,
      errorMessage: 'Only the proposer can execute this proposal.',
      canProceed: false
    };
  }

  // Check proposal state
  if (proposalState !== 'Succeeded') {
    return {
      isValid: false,
      errorMessage: `This proposal cannot be executed because it is in ${proposalState} state.`,
      canProceed: false
    };
  }

  // Check quorum
  const forVotesNum = parseFloat(forVotes);
  const quorumNum = parseFloat(quorum);
  
  if (forVotesNum < quorumNum) {
    return {
      isValid: false,
      errorMessage: `This proposal did not reach the required quorum of ${quorumNum} votes.`,
      canProceed: false
    };
  }

  // Check if votes are in favor
  const againstVotesNum = parseFloat(againstVotes);
  if (forVotesNum <= againstVotesNum) {
    return {
      isValid: false,
      errorMessage: 'This proposal cannot be executed because it did not pass (more against votes than for votes).',
      canProceed: false
    };
  }

  return {
    isValid: true,
    errorMessage: '',
    canProceed: true
  };
}

/**
 * Validate if a proposal can be canceled
 */
export function validateProposalCancellation(
  proposalState: string,
  isProposer: boolean
): VoteValidationResult {
  // Check if user is the proposer
  if (!isProposer) {
    return {
      isValid: false,
      errorMessage: 'Only the proposer can cancel this proposal.',
      canProceed: false
    };
  }

  // Check proposal state
  const validStates = ['Pending', 'Active', 'Succeeded'];
  if (!validStates.includes(proposalState)) {
    return {
      isValid: false,
      errorMessage: `This proposal cannot be canceled because it is in ${proposalState} state.`,
      canProceed: false
    };
  }

  return {
    isValid: true,
    errorMessage: '',
    canProceed: true
  };
}

/**
 * Get user-friendly message for proposal state
 */
export function getProposalStateMessage(state: string): string {
  switch (state) {
    case 'Pending':
      return 'This proposal is pending and waiting to enter the voting period.';
    case 'Active':
      return 'This proposal is active and open for voting.';
    case 'Canceled':
      return 'This proposal was canceled by the proposer.';
    case 'Defeated':
      return 'This proposal was defeated due to majority "Against" votes or failure to reach quorum.';
    case 'Succeeded':
      return 'This proposal has succeeded and is waiting to be executed.';
    case 'Queued':
      return 'This proposal is queued and waiting for execution.';
    case 'Expired':
      return 'This proposal has expired without being executed.';
    case 'Executed':
      return 'This proposal has been successfully executed.';
    default:
      return `This proposal is in ${state} state.`;
  }
}

/**
 * Get vote button text based on vote type
 */
export function getVoteButtonText(voteType: VoteType): string {
  switch (voteType) {
    case VoteType.For:
      return 'Vote For';
    case VoteType.Against:
      return 'Vote Against';
    case VoteType.Abstain:
      return 'Abstain';
    default:
      return 'Vote';
  }
}

/**
 * Get time remaining for proposal voting period
 */
export function getTimeRemaining(endDate: Date): string {
  try {
    const now = new Date();
    const end = new Date(endDate);
    
    if (isNaN(end.getTime())) {
      logger.warn('Invalid date format for getTimeRemaining', { endDate });
      return 'Unknown';
    }
    
    if (now > end) {
      return 'Voting period ended';
    }
    
    const diffMs = end.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ${diffHours} hour${diffHours !== 1 ? 's' : ''} remaining`;
    } else if (diffHours > 0) {
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} remaining`;
    } else {
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} remaining`;
    }
  } catch (error) {
    logger.error('Error calculating time remaining', error);
    return 'Unknown';
  }
} 