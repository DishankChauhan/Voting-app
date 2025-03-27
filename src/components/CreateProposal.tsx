import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { createProposal, getTokenBalance } from '@/services/contractService';
import { saveProposalToFirebase } from '@/services/firebaseService';
import { toast } from 'react-hot-toast';

interface CreateProposalProps {
  onProposalCreated?: () => void;
}

export default function CreateProposal({ onProposalCreated }: CreateProposalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationInDays, setDurationInDays] = useState(7);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  // Fetch user's token balance
  const fetchTokenBalance = async () => {
    if (user && user.walletAddress) {
      try {
        const balance = await getTokenBalance(user.walletAddress);
        setTokenBalance(balance);
      } catch (error) {
        console.error('Error fetching token balance:', error);
        toast.error('Failed to fetch your token balance');
      }
    }
  };

  // Fetch token balance when component mounts or user changes
  useEffect(() => {
    fetchTokenBalance();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !user.walletAddress) {
      toast.error('Please connect your wallet first');
      return;
    }
    
    if (!title || !description || durationInDays < 1) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create proposal on-chain
      const proposalId = await createProposal(title, description, durationInDays);
      
      if (proposalId > 0) {
        // Save additional metadata to Firebase
        await saveProposalToFirebase({
          id: proposalId,
          title,
          description,
          proposer: user.walletAddress,
          metadata: {
            createdAt: new Date()
          }
        });
        
        toast.success('Proposal created successfully!');
        // Call the callback function if provided
        if (onProposalCreated) {
          onProposalCreated();
        }
        // Reset form after successful creation
        setTitle('');
        setDescription('');
        setDurationInDays(7);
        
        // Only redirect if not using callback function
        if (!onProposalCreated) {
          router.push('/');
        }
      } else {
        toast.error('Failed to create proposal: Invalid proposal ID returned');
      }
    } catch (error: any) {
      console.error('Error creating proposal:', error);
      toast.error(`Failed to create proposal: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-900 p-6 rounded-lg shadow-md w-full max-w-xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-6">Create New Proposal</h2>
      
      {tokenBalance && (
        <div className="mb-6 p-3 bg-gray-800 rounded text-gray-300">
          <p>Your voting power: <span className="font-semibold text-green-400">{parseFloat(tokenBalance).toFixed(2)} GOV</span></p>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="title" className="block text-gray-300 font-medium mb-2">Title</label>
          <input
            type="text"
            id="title"
            className="w-full px-4 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-900 focus:outline-none"
            placeholder="Enter proposal title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="description" className="block text-gray-300 font-medium mb-2">Description</label>
          <textarea
            id="description"
            className="w-full px-4 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-900 focus:outline-none h-40"
            placeholder="Describe your proposal in detail"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>
        
        <div className="mb-6">
          <label htmlFor="duration" className="block text-gray-300 font-medium mb-2">Duration (days)</label>
          <input
            type="number"
            id="duration"
            className="w-full px-4 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-900 focus:outline-none"
            placeholder="Voting period in days"
            min="1"
            max="30"
            value={durationInDays}
            onChange={(e) => setDurationInDays(parseInt(e.target.value))}
            required
          />
        </div>
        
        <button
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150 ease-in-out"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating Proposal...' : 'Create Proposal'}
        </button>
      </form>
    </div>
  );
} 