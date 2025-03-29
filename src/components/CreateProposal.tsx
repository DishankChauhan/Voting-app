import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { createProposal, getTokenBalance } from '@/services/contractService';
import { saveProposalToFirebase } from '@/services/firebaseService';
import { toast } from 'react-hot-toast';

interface CreateProposalProps {
  onProposalCreated?: () => void;
}

// Types for proposal options
type ProposalType = 'standard' | 'multiple-choice';
type Option = {
  id: string;
  text: string;
};

export default function CreateProposal({ onProposalCreated }: CreateProposalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationInDays, setDurationInDays] = useState(7);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<string | null>(null);
  const [proposalType, setProposalType] = useState<ProposalType>('standard');
  
  // For multiple choice proposals
  const [options, setOptions] = useState<Option[]>([
    { id: '1', text: '' },
    { id: '2', text: '' }
  ]);
  
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

  const handleOptionChange = (id: string, value: string) => {
    setOptions(
      options.map(option => 
        option.id === id ? { ...option, text: value } : option
      )
    );
  };

  const handleAddOption = () => {
    if (options.length < 10) { // Limit to 10 options
      const newOptionId = (options.length + 1).toString();
      setOptions([...options, { id: newOptionId, text: '' }]);
    } else {
      toast.error('Maximum of 10 options allowed');
    }
  };

  const handleRemoveOption = (id: string) => {
    if (options.length > 2) { // Always keep at least 2 options
      setOptions(options.filter(option => option.id !== id));
    } else {
      toast.error('Minimum of 2 options required');
    }
  };

  const validateOptions = () => {
    // Only validate if multiple choice is selected
    if (proposalType !== 'multiple-choice') return true;
    
    // Check if all options have text
    const emptyOptions = options.filter(option => !option.text.trim());
    if (emptyOptions.length > 0) {
      toast.error('All options must have text');
      return false;
    }
    
    // Check for duplicate options
    const optionTexts = options.map(option => option.text.trim());
    const uniqueOptions = new Set(optionTexts);
    if (uniqueOptions.size !== options.length) {
      toast.error('Options must be unique');
      return false;
    }
    
    return true;
  };

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
    
    if (!validateOptions()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create proposal on-chain
      const proposalId = await createProposal(title, description, durationInDays);
      
      if (proposalId > 0) {
        // Prepare metadata based on proposal type
        const metadata: any = {
          createdAt: new Date(),
          proposalType
        };
        
        // Add options to metadata if multiple choice
        if (proposalType === 'multiple-choice') {
          metadata.options = options.map(option => option.text.trim());
        }
        
        // Save additional metadata to Firebase
        await saveProposalToFirebase({
          id: proposalId,
          title,
          description,
          proposer: user.walletAddress,
          metadata
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
        setProposalType('standard');
        setOptions([
          { id: '1', text: '' },
          { id: '2', text: '' }
        ]);
        
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
          <label className="block text-gray-300 font-medium mb-2">Proposal Type</label>
          <div className="flex space-x-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio text-indigo-600"
                checked={proposalType === 'standard'}
                onChange={() => setProposalType('standard')}
              />
              <span className="ml-2 text-gray-300">Standard (Yes/No/Abstain)</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio text-indigo-600"
                checked={proposalType === 'multiple-choice'}
                onChange={() => setProposalType('multiple-choice')}
              />
              <span className="ml-2 text-gray-300">Multiple Choice</span>
            </label>
          </div>
        </div>
        
        {proposalType === 'multiple-choice' && (
          <div className="mb-6">
            <label className="block text-gray-300 font-medium mb-2">Options</label>
            <div className="space-y-3">
              {options.map((option) => (
                <div key={option.id} className="flex items-center space-x-2">
                  <input
                    type="text"
                    className="flex-grow px-4 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-900 focus:outline-none"
                    placeholder={`Option ${option.id}`}
                    value={option.text}
                    onChange={(e) => handleOptionChange(option.id, e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(option.id)}
                    className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700"
                    title="Remove Option"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddOption}
                className="mt-2 inline-flex items-center px-3 py-2 border border-gray-700 rounded-md bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                </svg>
                Add Option
              </button>
            </div>
          </div>
        )}
        
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