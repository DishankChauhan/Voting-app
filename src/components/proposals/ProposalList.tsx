'use client';

import { useState, useEffect } from 'react';
import ProposalCard from './ProposalCard';
import { getProposals } from '@/services/contractService';
import { Proposal } from '@/lib/contractConfig';

const ProposalList = () => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProposals = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getProposals();
      setProposals(data);
    } catch (error: any) {
      console.error('Error fetching proposals:', error);
      setError('Failed to load proposals. Please check your wallet connection.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  const handleVoteSuccess = () => {
    // Refresh proposals after a vote
    fetchProposals();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-md my-4">
        <p>{error}</p>
        <button 
          onClick={fetchProposals}
          className="mt-2 text-sm underline hover:text-red-400"
        >
          Try again
        </button>
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <div className="bg-slate-800 border border-slate-700 text-gray-300 px-4 py-8 rounded-md text-center my-4">
        <p className="text-lg font-medium mb-2">No proposals found</p>
        <p className="text-gray-400">Be the first to create a proposal!</p>
      </div>
    );
  }

  // Sort proposals by status (active first) and then by deadline (most recent first)
  const sortedProposals = [...proposals].sort((a, b) => {
    // Active proposals first
    if (a.active && !b.active) return -1;
    if (!a.active && b.active) return 1;
    
    // Then by deadline (newer deadline first)
    return b.deadline.getTime() - a.deadline.getTime();
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Proposals</h2>
      
      {sortedProposals.map((proposal) => (
        <ProposalCard 
          key={proposal.id} 
          proposal={proposal} 
          onVoteSuccess={handleVoteSuccess} 
        />
      ))}
    </div>
  );
};

export default ProposalList; 