'use client';

import { useState } from 'react';
import ConnectWallet from '@/components/wallet/ConnectWallet';
import ProposalList from '@/components/ProposalList';
import CreateProposal from '@/components/CreateProposal';
import AuthButtons from '@/components/auth/AuthButtons';
import Link from 'next/link';

export default function Home() {
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleProposalCreated = () => {
    setShowCreateForm(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-12 pb-16">
        <header className="flex justify-between items-center mb-12">
          <div className="flex items-center">
            <div className="bg-indigo-600 w-10 h-10 rounded-lg flex items-center justify-center mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white">DAO Voting</h2>
          </div>
          
          <nav className="flex items-center space-x-4">
            <ConnectWallet />
            <AuthButtons />
            <Link 
              href="/profile" 
              className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center transition"
            >
              <span>Profile</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </Link>
            <Link 
              href="/admin" 
              className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center transition"
            >
              <span>Admin</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Link>
          </nav>
        </header>
        
        <div className="flex flex-col md:flex-row items-center py-12">
          <div className="md:w-1/2 mb-10 md:mb-0 md:pr-12">
            <h1 className="text-5xl font-bold mb-6 text-white leading-tight">
              Decentralized Governance <span className="text-indigo-500">Platform</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Create proposals, cast weighted votes, and participate in decentralized decision making with blockchain technology.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition"
              >
                Create Proposal
              </button>
              <Link
                href="/proposals"
                className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition"
              >
                View Proposals
              </Link>
            </div>
          </div>
          <div className="md:w-1/2 flex justify-center">
            <div className="relative w-80 h-80">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full opacity-20 animate-pulse"></div>
              <div className="absolute inset-4 bg-slate-800 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-32 w-32 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Proposal Section */}
      <div id="proposals" className="bg-slate-800 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
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
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-3xl font-bold text-white">Active Proposals</h2>
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
          </div>
        </div>
      </div>
    </main>
  );
} 