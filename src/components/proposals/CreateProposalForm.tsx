'use client';

import { useState, FormEvent } from 'react';
import { createProposal } from '@/services/contractService';
import { storeProposalMetadata } from '@/services/firebaseService';
import { getCurrentUser } from '@/services/firebaseService';

interface CreateProposalFormProps {
  onProposalCreated: () => void;
}

const CreateProposalForm = ({ onProposalCreated }: CreateProposalFormProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationInDays, setDurationInDays] = useState(7);
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateForm = () => {
    if (!title.trim()) {
      setError('Title is required');
      return false;
    }
    
    if (!description.trim()) {
      setError('Description is required');
      return false;
    }
    
    if (durationInDays < 1) {
      setError('Duration must be at least 1 day');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Create proposal on blockchain
      const proposalId = await createProposal(title, description, durationInDays);
      
      // Get current user
      const currentUser = getCurrentUser();
      
      if (currentUser && proposalId !== -1) {
        // Store additional metadata in Firebase
        await storeProposalMetadata(
          proposalId,
          currentUser.uid,
          currentUser.email || '',
          (window as any).ethereum.selectedAddress,
          '',
          category,
          []
        );
      }
      
      // Reset form
      setTitle('');
      setDescription('');
      setDurationInDays(7);
      setCategory('');
      
      // Notify parent component
      onProposalCreated();
    } catch (error: any) {
      setError(error.message || 'Failed to create proposal');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dark-card p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-white mb-4">Create New Proposal</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">
            Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="dark-input w-full px-3 py-2 rounded-md shadow-sm focus:outline-none"
            placeholder="Enter proposal title"
            disabled={isSubmitting}
            required
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="dark-input w-full px-3 py-2 rounded-md shadow-sm focus:outline-none"
            placeholder="Enter proposal description"
            disabled={isSubmitting}
            required
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="duration" className="block text-sm font-medium text-gray-300 mb-1">
            Duration (days)
          </label>
          <input
            type="number"
            id="duration"
            value={durationInDays}
            onChange={(e) => setDurationInDays(parseInt(e.target.value))}
            min={1}
            max={30}
            className="dark-input w-full px-3 py-2 rounded-md shadow-sm focus:outline-none"
            disabled={isSubmitting}
            required
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="category" className="block text-sm font-medium text-gray-300 mb-1">
            Category (optional)
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="dark-input w-full px-3 py-2 rounded-md shadow-sm focus:outline-none"
            disabled={isSubmitting}
          >
            <option value="">Select a category</option>
            <option value="governance">Governance</option>
            <option value="technical">Technical</option>
            <option value="community">Community</option>
            <option value="financial">Financial</option>
            <option value="other">Other</option>
          </select>
        </div>
        
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-2 px-4 rounded-lg transition-colors ${
            isSubmitting ? 'dark-button-disabled' : 'dark-button-primary'
          }`}
        >
          {isSubmitting ? 'Creating...' : 'Create Proposal'}
        </button>
      </form>
    </div>
  );
};

export default CreateProposalForm; 