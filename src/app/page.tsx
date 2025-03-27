'use client';

import { useState } from 'react';
import ConnectWallet from '@/components/wallet/ConnectWallet';
import ProposalList from '@/components/proposals/ProposalList';
import CreateProposalForm from '@/components/proposals/CreateProposalForm';

export default function Home() {
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleProposalCreated = () => {
    // Hide form after proposal is created
    setShowCreateForm(false);
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex flex-col items-center mb-8">
        <h1 className="text-4xl font-bold mb-4 text-center text-white">Decentralized Voting App</h1>
        <p className="text-xl text-gray-300 text-center max-w-2xl mb-6">
          Create and vote on proposals using blockchain technology
        </p>
        <ConnectWallet />
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Voting Dashboard</h2>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="dark-button-primary py-2 px-4 rounded-lg transition-colors"
          >
            {showCreateForm ? 'Cancel' : 'Create Proposal'}
          </button>
        </div>

        {showCreateForm && (
          <div className="mb-8">
            <CreateProposalForm onProposalCreated={handleProposalCreated} />
          </div>
        )}

        <ProposalList />
      </div>
    </main>
  );
} 