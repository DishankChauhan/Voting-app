import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { getProposals, castVote, executeProposal, cancelProposal } from '@/services/contractService';
import { getProposalFromFirebase, addCommentToProposal, getCommentsForProposal } from '@/services/firebaseService';
import { ProposalState, VoteType, Proposal } from '@/lib/contractConfig';
import { toast } from 'react-hot-toast';

export default function ProposalDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProposalDetails();
      fetchComments();
    }
  }, [id]);

  const fetchProposalDetails = async () => {
    setIsLoading(true);
    try {
      // Get all proposals and find the one we need
      const proposals = await getProposals();
      const foundProposal = proposals.find(p => p.id === Number(id));
      
      if (foundProposal) {
        // Get additional metadata from Firebase if available
        try {
          const metadata = await getProposalFromFirebase(Number(id));
          if (metadata) {
            foundProposal.metadata = metadata;
          }
        } catch (error) {
          console.error('Error fetching proposal metadata:', error);
        }
        
        setProposal(foundProposal);
      } else {
        toast.error('Proposal not found');
        router.push('/');
      }
    } catch (error) {
      console.error('Error fetching proposal details:', error);
      toast.error('Failed to load proposal details');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchComments = async () => {
    if (!id) return;
    
    try {
      const fetchedComments = await getCommentsForProposal(Number(id));
      setComments(fetchedComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleVote = async (support: VoteType) => {
    if (!user || !user.walletAddress) {
      toast.error('Please connect your wallet first');
      return;
    }
    
    if (!proposal) return;
    
    setIsSubmitting(true);
    
    try {
      await castVote(proposal.id, support);
      toast.success('Vote cast successfully!');
      
      // Refresh proposal details
      await fetchProposalDetails();
    } catch (error: any) {
      console.error('Error voting:', error);
      toast.error(`Failed to vote: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecute = async () => {
    if (!user || !user.walletAddress) {
      toast.error('Please connect your wallet first');
      return;
    }
    
    if (!proposal) return;
    
    setIsSubmitting(true);
    
    try {
      await executeProposal(proposal.id);
      toast.success('Proposal executed successfully!');
      
      // Refresh proposal details
      await fetchProposalDetails();
    } catch (error: any) {
      console.error('Error executing proposal:', error);
      toast.error(`Failed to execute: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!user || !user.walletAddress) {
      toast.error('Please connect your wallet first');
      return;
    }
    
    if (!proposal) return;
    
    setIsSubmitting(true);
    
    try {
      await cancelProposal(proposal.id);
      toast.success('Proposal canceled successfully!');
      
      // Refresh proposal details
      await fetchProposalDetails();
    } catch (error: any) {
      console.error('Error canceling proposal:', error);
      toast.error(`Failed to cancel: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !user.walletAddress) {
      toast.error('Please connect your wallet first');
      return;
    }
    
    if (!newComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await addCommentToProposal(
        Number(id),
        user.walletAddress,
        newComment
      );
      
      toast.success('Comment added');
      setNewComment('');
      
      // Refresh comments
      await fetchComments();
    } catch (error) {
      console.error('Error posting comment:', error);
      toast.error('Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

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

  // Format vote counts
  const formatVotes = (voteCount: number) => {
    return voteCount.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  // Calculate voting progress
  const calculateProgress = () => {
    if (!proposal) return { forPercentage: 0, againstPercentage: 0, abstainPercentage: 0 };
    
    const total = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
    
    if (total === 0) {
      return { forPercentage: 0, againstPercentage: 0, abstainPercentage: 0 };
    }
    
    return {
      forPercentage: (proposal.forVotes / total) * 100,
      againstPercentage: (proposal.againstVotes / total) * 100,
      abstainPercentage: (proposal.abstainVotes / total) * 100,
    };
  };

  // Calculate remaining time
  const getRemainingTime = (endTime: Date) => {
    const now = new Date();
    const timeDiff = endTime.getTime() - now.getTime();
    
    if (timeDiff <= 0) {
      return 'Voting period has ended';
    }
    
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${days} days, ${hours} hours, ${minutes} minutes remaining`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-white mb-3">Proposal Not Found</h2>
        <p className="text-gray-400">The proposal you're looking for doesn't exist or has been removed.</p>
        <button 
          onClick={() => router.push('/')}
          className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded transition"
        >
          Back to Proposals
        </button>
      </div>
    );
  }

  const { forPercentage, againstPercentage, abstainPercentage } = calculateProgress();

  return (
    <div className="bg-gray-900 rounded-lg p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <h1 className="text-3xl font-bold text-white">{proposal.title}</h1>
        <span className={`text-sm font-semibold px-3 py-1 rounded text-white ${getStateClass(proposal.state)}`}>
          {getProposalStateText(proposal.state)}
        </span>
      </div>
      
      <div className="mb-8">
        <div className="flex items-center text-gray-500 text-sm mb-2">
          <span>ID: {proposal.id}</span>
          <span className="mx-2">•</span>
          <span>Created: {proposal.startTime.toLocaleDateString()}</span>
          <span className="mx-2">•</span>
          <span>Ends: {proposal.endTime.toLocaleDateString()}</span>
        </div>
        
        <p className="text-gray-300 whitespace-pre-line">{proposal.description}</p>
      </div>
      
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-white mb-4">Voting Status</h3>
        
        <div className="grid grid-cols-3 gap-6 mb-6">
          <div className="bg-green-900/30 p-4 rounded text-center">
            <p className="text-sm text-gray-400 mb-1">For</p>
            <p className="text-xl font-semibold text-green-400">
              {formatVotes(proposal.forVotes)}
            </p>
            <p className="text-xs text-gray-500 mt-1">{forPercentage.toFixed(2)}%</p>
          </div>
          <div className="bg-red-900/30 p-4 rounded text-center">
            <p className="text-sm text-gray-400 mb-1">Against</p>
            <p className="text-xl font-semibold text-red-400">
              {formatVotes(proposal.againstVotes)}
            </p>
            <p className="text-xs text-gray-500 mt-1">{againstPercentage.toFixed(2)}%</p>
          </div>
          <div className="bg-gray-700/30 p-4 rounded text-center">
            <p className="text-sm text-gray-400 mb-1">Abstain</p>
            <p className="text-xl font-semibold text-gray-400">
              {formatVotes(proposal.abstainVotes)}
            </p>
            <p className="text-xs text-gray-500 mt-1">{abstainPercentage.toFixed(2)}%</p>
          </div>
        </div>
        
        <div className="w-full bg-gray-700 rounded-full h-2.5 mb-2">
          <div className="flex h-2.5 rounded-full overflow-hidden">
            <div 
              className="bg-green-500"
              style={{ width: `${forPercentage}%` }}
            ></div>
            <div 
              className="bg-red-500"
              style={{ width: `${againstPercentage}%` }}
            ></div>
            <div 
              className="bg-gray-500"
              style={{ width: `${abstainPercentage}%` }}
            ></div>
          </div>
        </div>
        
        <p className="text-gray-500 text-sm mt-4">
          {proposal.state === ProposalState.Active ? getRemainingTime(proposal.endTime) : `Voting ended on ${proposal.endTime.toLocaleDateString()}`}
        </p>
        
        {proposal.hasVoted && (
          <div className="mt-4 p-3 bg-indigo-900/30 rounded text-indigo-300 text-sm">
            You have already voted on this proposal with {formatVotes(proposal.userVoteWeight)} voting power.
          </div>
        )}
      </div>
      
      {proposal.state === ProposalState.Active && !proposal.hasVoted && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-white mb-4">Cast Your Vote</h3>
          <div className="flex space-x-4">
            <button
              onClick={() => handleVote(VoteType.For)}
              disabled={isSubmitting}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Vote For
            </button>
            <button
              onClick={() => handleVote(VoteType.Against)}
              disabled={isSubmitting}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Vote Against
            </button>
            <button
              onClick={() => handleVote(VoteType.Abstain)}
              disabled={isSubmitting}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Abstain
            </button>
          </div>
        </div>
      )}
      
      {proposal.state === ProposalState.Succeeded && (
        <div className="mb-8">
          <button
            onClick={handleExecute}
            disabled={isSubmitting}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Execute Proposal
          </button>
        </div>
      )}
      
      {proposal.state === ProposalState.Active && user && proposal.metadata?.creator === user.walletAddress && (
        <div className="mb-8">
          <button
            onClick={handleCancel}
            disabled={isSubmitting}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Cancel Proposal
          </button>
        </div>
      )}
      
      <div className="mt-12">
        <h3 className="text-xl font-semibold text-white mb-4">Comments ({comments.length})</h3>
        
        <form onSubmit={handleSubmitComment} className="mb-6">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="w-full px-4 py-3 rounded bg-gray-800 text-white border border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-900 focus:outline-none h-24 mb-3"
            disabled={!user || isSubmitting}
          ></textarea>
          
          <button
            type="submit"
            disabled={!user || isSubmitting || !newComment.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isSubmitting ? 'Posting...' : 'Post Comment'}
          </button>
        </form>
        
        {comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="bg-gray-800 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono text-sm text-gray-400">
                    {comment.author.substring(0, 6)}...{comment.author.substring(comment.author.length - 4)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(comment.createdAt.seconds * 1000).toLocaleString()}
                  </span>
                </div>
                <p className="text-gray-300">{comment.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 