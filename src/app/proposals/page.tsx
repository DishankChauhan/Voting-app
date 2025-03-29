'use client';

import { useState } from 'react';
import Link from 'next/link';
import ProposalList from '@/components/ProposalList';
import CreateProposal from '@/components/CreateProposal';
import ConnectWallet from '@/components/wallet/ConnectWallet';

export default function ProposalsPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleProposalCreated = () => {
    setShowCreateForm(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="container mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">Governance Proposals</h1>
          <div className="flex items-center gap-4">
            <Link href="/delegates" className="text-indigo-400 hover:text-indigo-300">
              View Delegates
            </Link>
            <Link href="/" className="text-indigo-400 hover:text-indigo-300">
              Back to Home
            </Link>
          </div>
        </div>

        {showCreateForm ? (
          <div className="bg-slate-900 rounded-xl p-6 mb-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Create New Proposal</h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <CreateProposal onProposalCreated={handleProposalCreated} />
          </div>
        ) : (
          <div className="flex justify-end mb-6">
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-6 rounded-lg transition flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Create Proposal
            </button>
          </div>
        )}

        <div className="bg-slate-900 rounded-xl p-6">
          <ProposalList />
        </div>

        <div className="mt-12 bg-slate-900 rounded-xl p-6">
          <h2 className="text-2xl font-bold text-white mb-4">What are Governance Proposals?</h2>
          <p className="text-gray-300 mb-4">
            Governance proposals allow token holders to suggest changes to the protocol or organization. 
            Each proposal can be voted on by token holders, with votes weighted by the amount of governance tokens held.
          </p>
          <p className="text-gray-300 mb-4">
            To create a proposal, you need to connect your wallet and own governance tokens. Your voting power
            is directly proportional to the number of tokens you hold at the time of voting.
          </p>
          <h3 className="text-xl font-bold text-white mt-6 mb-2">Proposal States</h3>
          <ul className="list-disc pl-5 text-gray-300 space-y-2">
            <li><span className="text-purple-400 font-medium">Pending</span> - Proposal has been created but voting has not started yet</li>
            <li><span className="text-blue-400 font-medium">Active</span> - Proposal is open for voting</li>
            <li><span className="text-green-400 font-medium">Succeeded</span> - Proposal passed but not yet executed</li>
            <li><span className="text-red-400 font-medium">Defeated</span> - Proposal did not receive enough votes to pass</li>
            <li><span className="text-gray-400 font-medium">Canceled</span> - Proposal was canceled by the creator</li>
            <li><span className="text-green-600 font-medium">Executed</span> - Proposal was executed successfully</li>
            <li><span className="text-yellow-400 font-medium">Expired</span> - Proposal passed but was not executed in time</li>
          </ul>
        </div>
      </div>
    </main>
  );
} 