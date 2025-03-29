import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { 
  castQuadraticVote, 
  getVotingPower, 
  ProposalState,
  ContractServiceError,
  ContractErrorType,
  VoteType
} from '@/services/contractService';
import { castPrivateVote, PrivacyLevel } from '@/services/zkService';
import { Lock, ThumbsUp, ThumbsDown, Slash, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import logger from '@/utils/logger';
import PrivacyVotingSettings from './PrivacyVotingSettings';

interface VoteFormProps {
  proposalId: number;
  proposalState: ProposalState;
  endTime: Date;
  hasUserVoted: boolean;
  onVoteSuccess?: () => void;
  className?: string;
}

export default function VoteForm({
  proposalId,
  proposalState,
  endTime,
  hasUserVoted,
  onVoteSuccess,
  className = ''
}: VoteFormProps) {
  const { user } = useAuth();
  const [selectedVote, setSelectedVote] = useState<VoteType | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [votingPower, setVotingPower] = useState<string>('0');
  const [canVote, setCanVote] = useState<boolean>(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [privacyLevel, setPrivacyLevel] = useState<PrivacyLevel>(PrivacyLevel.PUBLIC);
  const [voteSecret, setVoteSecret] = useState<string>('');

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
    if (proposalState !== ProposalState.Active) {
      setTimeRemaining('');
      return;
    }

    const updateTimeRemaining = () => {
      const now = new Date();
      const diff = endTime.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeRemaining('Voting has ended');
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (days > 0) {
        setTimeRemaining(`${days} days, ${hours} hours remaining`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours} hours, ${minutes} minutes remaining`);
      } else {
        setTimeRemaining(`${minutes} minutes remaining`);
      }
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

    if (hasUserVoted) {
      setCanVote(false);
      setValidationMessage('You have already voted on this proposal');
      return;
    }

    if (proposalState !== ProposalState.Active) {
      setCanVote(false);
      setValidationMessage('This proposal is not active for voting');
      return;
    }

    const votingPowerNum = parseFloat(votingPower);
    if (votingPowerNum <= 0) {
      setCanVote(false);
      setValidationMessage('You need governance tokens to vote');
      return;
    }

    setCanVote(true);
    setValidationMessage(null);
  }, [user?.walletAddress, votingPower, hasUserVoted, proposalState]);

  // Handle vote selection
  const handleVoteSelect = (voteType: VoteType) => {
    if (!canVote) return;
    setSelectedVote(voteType);
  };

  // Handle privacy level change
  const handlePrivacyLevelChange = (level: PrivacyLevel) => {
    setPrivacyLevel(level);
  };

  // Handle secret change
  const handleSecretChange = (secret: string) => {
    setVoteSecret(secret);
  };

  // Handle vote submission
  const handleVoteSubmit = async () => {
    if (!user?.walletAddress || !canVote || selectedVote === null) {
      toast.error('Please select a voting option');
      return;
    }

    setIsVoting(true);
    try {
      if (privacyLevel === PrivacyLevel.PUBLIC) {
        // Cast a regular public vote
        logger.debug('Casting public vote', { proposalId, voteType: selectedVote });
        await castQuadraticVote(proposalId, selectedVote);
      } else if (privacyLevel === PrivacyLevel.PRIVATE) {
        // Cast a private vote with ZK-SNARKs
        if (!voteSecret || voteSecret.length < 8) {
          toast.error('Please enter a strong secret for private voting');
          setIsVoting(false);
          return;
        }
        
        logger.debug('Casting private vote', { proposalId });
        await castPrivateVote(proposalId, selectedVote, voteSecret);
      } else if (privacyLevel === PrivacyLevel.HYBRID) {
        // Cast both private and public votes
        if (!voteSecret || voteSecret.length < 8) {
          toast.error('Please enter a strong secret for hybrid voting');
          setIsVoting(false);
          return;
        }
        
        logger.debug('Casting hybrid vote', { proposalId });
        // First cast the public vote
        await castQuadraticVote(proposalId, selectedVote);
        // Then cast the private vote
        await castPrivateVote(proposalId, selectedVote, voteSecret);
      }
      
      toast.success('Vote cast successfully!');
      setSelectedVote(null);
      setVoteSecret('');
      
      // Call onVoteSuccess callback if provided
      if (onVoteSuccess) {
        onVoteSuccess();
      }
    } catch (error) {
      logger.error('Error casting vote', error);
      
      if (error instanceof ContractServiceError) {
        if (error.type === ContractErrorType.INSUFFICIENT_FUNDS) {
          toast.error('You need governance tokens to vote');
        } else if (error.type === ContractErrorType.ALREADY_VOTED) {
          toast.error('You have already voted on this proposal');
        } else {
          toast.error(`Error: ${error.message}`);
        }
      } else {
        toast.error('An error occurred while casting your vote');
      }
    } finally {
      setIsVoting(false);
    }
  };

  // Render vote button with status
  const renderVoteButton = (voteType: VoteType, label: string, icon: React.ReactNode) => {
    const isSelected = selectedVote === voteType;
    
    const baseClasses = 
      'flex flex-col items-center justify-center p-4 rounded-lg transition-all duration-200 border-2 h-28';
    
    const voteTypeStyles = {
      [VoteType.For]: {
        selected: 'bg-green-900/30 border-green-500 text-green-400 ring-green-500/30 ring-4',
        default: 'border-green-700/50 hover:border-green-500 text-green-600 hover:text-green-400 hover:bg-green-900/20'
      },
      [VoteType.Against]: {
        selected: 'bg-red-900/30 border-red-500 text-red-400 ring-red-500/30 ring-4',
        default: 'border-red-700/50 hover:border-red-500 text-red-600 hover:text-red-400 hover:bg-red-900/20'
      },
      [VoteType.Abstain]: {
        selected: 'bg-gray-700/50 border-gray-500 text-gray-300 ring-gray-500/30 ring-4',
        default: 'border-gray-700 hover:border-gray-500 text-gray-500 hover:text-gray-300 hover:bg-gray-800'
      }
    };
    
    const style = voteTypeStyles[voteType];
    const finalClass = `${baseClasses} ${isSelected ? style.selected : style.default} ${!canVote ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`;

    return (
      <div 
        className={finalClass}
        onClick={() => canVote && handleVoteSelect(voteType)}
        role="button"
        aria-pressed={isSelected}
        tabIndex={0}
      >
        <div className="h-12 w-12 mb-2 flex items-center justify-center">
          {icon}
        </div>
        <span className="font-medium">{label}</span>
      </div>
    );
  };

  // Get vote type text
  const getVoteTypeText = (voteType: VoteType) => {
    switch (voteType) {
      case VoteType.For: return 'For';
      case VoteType.Against: return 'Against';
      case VoteType.Abstain: return 'Abstain';
      default: return '';
    }
  };

  return (
    <Card className={`bg-gray-900 p-6 ${className}`}>
      <Tabs defaultValue="vote" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="vote">Vote</TabsTrigger>
          <TabsTrigger value="privacy">Privacy Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="vote" className="space-y-4">
          <h3 className="text-lg font-semibold text-white mb-4">Cast Your Vote</h3>
          
          {validationMessage && !canVote && (
            <div className="mb-4 p-3 bg-amber-900/30 text-amber-400 rounded-md text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>{validationMessage}</span>
            </div>
          )}
          
          {canVote && (
            <div className="mb-4 bg-indigo-900/30 p-3 rounded-md text-indigo-300 text-sm">
              <div className="flex justify-between">
                <span>Your Voting Power:</span>
                <span className="font-medium">{parseFloat(votingPower).toFixed(2)} votes</span>
              </div>
              
              {privacyLevel !== PrivacyLevel.PUBLIC && (
                <div className="mt-2 pt-2 border-t border-indigo-800/50 flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  <span className="text-indigo-200">
                    Voting with {privacyLevel} privacy
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 mb-4">
            {renderVoteButton(VoteType.For, 'For', <ThumbsUp className="h-6 w-6" />)}
            {renderVoteButton(VoteType.Against, 'Against', <ThumbsDown className="h-6 w-6" />)}
            {renderVoteButton(VoteType.Abstain, 'Abstain', <Slash className="h-6 w-6" />)}
          </div>
          
          <Button
            onClick={handleVoteSubmit}
            disabled={isVoting || !canVote || selectedVote === null}
            className="w-full"
            size="lg"
          >
            {isVoting 
              ? 'Confirming Vote...' 
              : selectedVote !== null
                ? `Vote ${getVoteTypeText(selectedVote)}`
                : 'Cast Your Vote'
            }
          </Button>
          
          {timeRemaining && (
            <p className="mt-4 text-center text-gray-500 text-sm">
              {timeRemaining}
            </p>
          )}
        </TabsContent>
        
        <TabsContent value="privacy">
          <PrivacyVotingSettings 
            proposalId={proposalId}
            onPrivacyLevelChange={handlePrivacyLevelChange}
            onSecretChange={handleSecretChange}
          />
        </TabsContent>
      </Tabs>
    </Card>
  );
} 