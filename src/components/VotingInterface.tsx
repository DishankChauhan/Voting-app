import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import { castQuadraticVote, getVotingPower, ProposalState, ContractServiceError, ContractErrorType } from '@/services/contractService';
import { validateVoteCast, VoteType, getVoteButtonText, getTimeRemaining } from '@/utils/voteValidation';
import { logger } from '@/utils/logger';

interface VotingInterfaceProps {
  proposalId: string;
  proposalState: string;
  endTime: Date;
  hasUserVoted: boolean;
  onVoteSuccess?: () => void;
  className?: string;
  proposalType?: string;
  options?: string[];
}

/**
 * Enhanced voting interface component with validation and state management
 */
const VotingInterface = ({
  proposalId,
  proposalState,
  endTime,
  hasUserVoted,
  onVoteSuccess,
  className = '',
  proposalType = 'standard',
  options = []
}: VotingInterfaceProps) => {
  const { user } = useAuth();
  const [selectedVote, setSelectedVote] = useState<VoteType | null>(null);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [votingPower, setVotingPower] = useState<string>('0');
  const [canVote, setCanVote] = useState<boolean>(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  // Fetch voting power on component mount
  useEffect(() => {
    const fetchVotingPower = async () => {
      if (!user?.walletAddress) {
        setVotingPower('0');
        return;
      }

      try {
        const power = await getVotingPower(user.walletAddress);
        setVotingPower(power);
        logger.debug('Fetched voting power', { votingPower: power });
      } catch (error) {
        logger.error('Error fetching voting power', error);
        setVotingPower('0');
      }
    };

    fetchVotingPower();
  }, [user?.walletAddress]);

  // Update time remaining every minute
  useEffect(() => {
    if (proposalState !== 'Active') {
      setTimeRemaining('');
      return;
    }

    const updateTimeRemaining = () => {
      setTimeRemaining(getTimeRemaining(endTime));
    };

    updateTimeRemaining();
    const intervalId = setInterval(updateTimeRemaining, 60000);

    return () => clearInterval(intervalId);
  }, [endTime, proposalState]);

  // Validate if user can vote
  useEffect(() => {
    if (!user?.walletAddress) {
      setCanVote(false);
      setValidationMessage('Connect your wallet to vote');
      return;
    }

    const validation = validateVoteCast(votingPower, hasUserVoted, proposalState);
    setCanVote(validation.canProceed);
    
    if (!validation.isValid) {
      setValidationMessage(validation.errorMessage);
    } else {
      setValidationMessage(null);
    }
  }, [user?.walletAddress, votingPower, hasUserVoted, proposalState]);

  // Handle vote selection for standard voting
  const handleVoteSelect = (voteType: VoteType) => {
    if (!canVote) return;
    setSelectedVote(voteType);
  };

  // Handle option selection for multiple choice voting
  const handleOptionSelect = (optionIndex: number) => {
    if (!canVote) return;
    setSelectedOptionIndex(optionIndex);
  };

  // Handle vote submission
  const handleVoteSubmit = async () => {
    if (!user?.walletAddress || !canVote) return;
    
    // For standard voting, ensure a vote type is selected
    if (proposalType === 'standard' && selectedVote === null) {
      toast.error('Please select a voting option');
      return;
    }
    
    // For multiple choice voting, ensure an option is selected
    if (proposalType === 'multiple-choice' && selectedOptionIndex === null) {
      toast.error('Please select an option');
      return;
    }

    setIsVoting(true);
    try {
      if (proposalType === 'standard' && selectedVote !== null) {
        logger.debug('Casting standard vote', { proposalId, voteType: selectedVote });
        await castQuadraticVote(parseInt(proposalId), selectedVote);
      } else if (proposalType === 'multiple-choice' && selectedOptionIndex !== null) {
        logger.debug('Casting multiple choice vote', { proposalId, optionIndex: selectedOptionIndex });
        // Cast vote with the selected option index + 1 (since contract expects 1-based indexing)
        await castQuadraticVote(parseInt(proposalId), selectedOptionIndex);
      }
      
      toast.success('Vote cast successfully!');
      setSelectedVote(null);
      setSelectedOptionIndex(null);
      
      // Call onVoteSuccess callback if provided
      if (onVoteSuccess) {
        onVoteSuccess();
      }
    } catch (error) {
      logger.error('Error casting vote', error);
      
      // Show specific error message based on error type
      if (error instanceof ContractServiceError) {
        switch (error.type) {
          case ContractErrorType.PROVIDER_NOT_FOUND:
            toast.error('Please install MetaMask or use a compatible browser');
            break;
          case ContractErrorType.USER_REJECTED:
            toast.error('Transaction was rejected');
            break;
          case ContractErrorType.CONTRACT_ERROR:
            toast.error(error.message || 'Failed to cast vote due to contract error');
            break;
          default:
            toast.error(error.message || 'Failed to cast vote');
        }
      } else {
        toast.error('An error occurred while casting your vote');
      }
    } finally {
      setIsVoting(false);
    }
  };

  // Render vote button with status
  const renderVoteButton = (voteType: VoteType, label: string, iconSvg: React.ReactNode) => {
    const isSelected = selectedVote === voteType;
    const baseClasses = 
      'flex flex-col items-center p-4 rounded-lg transition-all duration-200 border-2';
    
    const selectedClasses = {
      [VoteType.For]: 'bg-green-900/30 border-green-500 text-green-400 ring-green-500/30 ring-4',
      [VoteType.Against]: 'bg-red-900/30 border-red-500 text-red-400 ring-red-500/30 ring-4',
      [VoteType.Abstain]: 'bg-gray-700/50 border-gray-500 text-gray-300 ring-gray-500/30 ring-4',
    };
    
    const defaultClasses = {
      [VoteType.For]: 'border-green-700/50 hover:border-green-500 text-green-600 hover:text-green-400 hover:bg-green-900/20',
      [VoteType.Against]: 'border-red-700/50 hover:border-red-500 text-red-600 hover:text-red-400 hover:bg-red-900/20',
      [VoteType.Abstain]: 'border-gray-700 hover:border-gray-500 text-gray-500 hover:text-gray-300 hover:bg-gray-800',
    };
    
    const classes = `${baseClasses} ${isSelected ? selectedClasses[voteType] : defaultClasses[voteType]} ${!canVote ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`;

    return (
      <div 
        className={classes}
        onClick={() => canVote && handleVoteSelect(voteType)}
        role="button"
        aria-pressed={isSelected}
        tabIndex={0}
      >
        <div className="h-10 w-10 mb-2 flex items-center justify-center">
          {iconSvg}
        </div>
        <span className="font-medium">{label}</span>
      </div>
    );
  };
  
  // Render multiple choice option button
  const renderOptionButton = (optionText: string, index: number) => {
    const isSelected = selectedOptionIndex === index;
    const baseClasses = 
      'w-full flex justify-between items-center p-4 rounded-lg transition-all duration-200 border-2 mb-2';
    
    const selectedClass = 'bg-indigo-900/30 border-indigo-500 text-indigo-400 ring-indigo-500/30 ring-4';
    const defaultClass = 'border-gray-700 hover:border-indigo-500 text-gray-300 hover:text-indigo-400 hover:bg-indigo-900/20';
    
    const classes = `${baseClasses} ${isSelected ? selectedClass : defaultClass} ${!canVote ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`;

    return (
      <div 
        key={index}
        className={classes}
        onClick={() => canVote && handleOptionSelect(index)}
        role="button"
        aria-pressed={isSelected}
        tabIndex={0}
      >
        <span className="font-medium">{optionText}</span>
        {isSelected && (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
    );
  };

  // Define vote option icons
  const forIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 15l7-7 7 7" />
    </svg>
  );
  
  const againstIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
    </svg>
  );
  
  const abstainIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 12H6" />
    </svg>
  );

  if (proposalState !== 'Active') {
    return (
      <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-white mb-3">Voting Closed</h3>
        <p className="text-gray-400">
          This proposal is no longer accepting votes.
          {proposalState === 'Pending' && ' Voting period has not started yet.'}
        </p>
      </div>
    );
  }

  if (hasUserVoted) {
    return (
      <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
        <div className="flex items-center text-indigo-400 mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <h3 className="text-lg font-semibold">Vote Recorded</h3>
        </div>
        <p className="text-gray-400">
          You have already cast your vote on this proposal.
        </p>
        {timeRemaining && (
          <p className="mt-2 text-gray-500 text-sm">
            {timeRemaining}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-white mb-4">Cast Your Vote</h3>
      
      {validationMessage && !canVote && (
        <div className="mb-4 p-3 bg-amber-900/30 text-amber-400 rounded-md text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {validationMessage}
        </div>
      )}
      
      {canVote && (
        <div className="mb-4 bg-indigo-900/30 p-3 rounded-md text-indigo-300 text-sm">
          <div className="flex justify-between">
            <span>Your Voting Power:</span>
            <span className="font-medium">{parseFloat(votingPower).toFixed(2)} votes</span>
          </div>
        </div>
      )}

      {proposalType === 'standard' ? (
        // Standard voting interface with For/Against/Abstain options
        <div className="grid grid-cols-3 gap-3 mb-4">
          {renderVoteButton(VoteType.For, 'For', forIcon)}
          {renderVoteButton(VoteType.Against, 'Against', againstIcon)}
          {renderVoteButton(VoteType.Abstain, 'Abstain', abstainIcon)}
        </div>
      ) : (
        // Multiple choice voting interface
        <div className="mb-4">
          <p className="text-gray-400 text-sm mb-3">Select one of the following options:</p>
          <div className="space-y-2">
            {options.map((option, index) => 
              renderOptionButton(option, index)
            )}
          </div>
        </div>
      )}
      
      <button
        onClick={handleVoteSubmit}
        disabled={
          isVoting || 
          !canVote || 
          (proposalType === 'standard' && selectedVote === null) || 
          (proposalType === 'multiple-choice' && selectedOptionIndex === null)
        }
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline transition-colors duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isVoting 
          ? 'Confirming Vote...' 
          : (proposalType === 'standard' && selectedVote !== null)
            ? `Vote ${getVoteButtonText(selectedVote)}`
            : (proposalType === 'multiple-choice' && selectedOptionIndex !== null)
              ? 'Confirm Vote'
              : 'Cast Your Vote'
        }
      </button>
      
      {timeRemaining && (
        <p className="mt-4 text-center text-gray-500 text-sm">
          {timeRemaining}
        </p>
      )}
    </div>
  );
};

export default VotingInterface;