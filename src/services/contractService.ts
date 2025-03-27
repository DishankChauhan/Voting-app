import { ethers } from 'ethers';
import { VOTING_ABI, VOTING_CONTRACT_ADDRESS, Proposal } from '@/lib/contractConfig';

// Get the provider and signer
export const getProviderAndSigner = async () => {
  if (typeof window === 'undefined') {
    throw new Error('This function can only be called in browser context');
  }
  
  const { ethereum } = window as any;
  
  if (!ethereum) {
    throw new Error('MetaMask is not installed. Please install it to use this app.');
  }

  const provider = new ethers.BrowserProvider(ethereum);
  const signer = await provider.getSigner();
  return { provider, signer };
};

// Get the contract instance
export const getContract = async (useSigner = false) => {
  try {
    if (!VOTING_CONTRACT_ADDRESS) {
      throw new Error('Contract address is not configured. Please deploy the contract first.');
    }
    
    const { provider, signer } = await getProviderAndSigner();
    
    // Return contract instance with signer (for transactions) or provider (for read-only)
    return new ethers.Contract(
      VOTING_CONTRACT_ADDRESS,
      VOTING_ABI,
      useSigner ? signer : provider
    );
  } catch (error) {
    console.error('Error getting contract:', error);
    throw error;
  }
};

// Get all proposals
export const getProposals = async (): Promise<Proposal[]> => {
  try {
    if (!VOTING_CONTRACT_ADDRESS) {
      throw new Error('Contract address is not configured. Please deploy the contract first.');
    }
    
    const contract = await getContract();
    const userAddress = (await (await getProviderAndSigner()).signer.getAddress()).toLowerCase();
    
    // Get total number of proposals
    const count = await contract.getProposalCount();
    const proposals: Proposal[] = [];
    
    // Fetch each proposal
    for (let i = 0; i < count; i++) {
      const proposal = await contract.getProposal(i);
      const hasVoted = await contract.hasVoted(i, userAddress);
      
      proposals.push({
        id: i,
        title: proposal[0],
        description: proposal[1],
        voteCount: Number(proposal[2]),
        deadline: new Date(Number(proposal[3]) * 1000), // Convert seconds to milliseconds
        active: proposal[4],
        hasVoted
      });
    }
    
    return proposals;
  } catch (error) {
    console.error('Error getting proposals:', error);
    throw error;
  }
};

// Create a new proposal
export const createProposal = async (
  title: string,
  description: string,
  durationInDays: number
): Promise<number> => {
  try {
    const contract = await getContract(true);
    const tx = await contract.createProposal(title, description, durationInDays);
    
    // Wait for the transaction to be mined
    const receipt = await tx.wait();
    
    // Extract the proposal ID from the event
    const event = receipt.logs
      .filter((log: any) => log.fragment?.name === 'ProposalCreated')
      .map((log: any) => {
        const parsedLog = contract.interface.parseLog({
          topics: [...log.topics],
          data: log.data,
        });
        return parsedLog?.args;
      })[0];
    
    return event ? Number(event[0]) : -1;
  } catch (error) {
    console.error('Error creating proposal:', error);
    throw error;
  }
};

// Vote on a proposal
export const voteOnProposal = async (proposalId: number): Promise<void> => {
  try {
    const contract = await getContract(true);
    const tx = await contract.vote(proposalId);
    await tx.wait();
  } catch (error) {
    console.error(`Error voting on proposal ${proposalId}:`, error);
    throw error;
  }
};

// Close an expired proposal
export const closeExpiredProposal = async (proposalId: number): Promise<void> => {
  try {
    const contract = await getContract(true);
    const tx = await contract.closeExpiredProposal(proposalId);
    await tx.wait();
  } catch (error) {
    console.error(`Error closing proposal ${proposalId}:`, error);
    throw error;
  }
}; 