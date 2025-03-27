import { ethers } from 'ethers';
import {
  VOTING_ABI,
  VOTING_CONTRACT_ADDRESS,
  GOVERNANCE_TOKEN_ABI,
  GOVERNANCE_TOKEN_ADDRESS,
  Proposal,
  ProposalState,
  VoteType,
  contractConfig
} from '@/lib/contractConfig';

// Get the Ethereum provider
export const getProvider = () => {
  try {
    if (typeof window !== 'undefined' && window.ethereum) {
      console.log('Getting Ethereum provider from window.ethereum');
      return new ethers.BrowserProvider(window.ethereum);
    }
    console.error('Ethereum provider not found. Please install MetaMask.');
    throw new Error('Ethereum provider not found. Please install MetaMask.');
  } catch (error) {
    console.error('Error getting provider:', error);
    throw error;
  }
};

// Get the signer for transactions
export const getSigner = async () => {
  try {
    const provider = getProvider();
    console.log('Getting signer from provider');
    return await provider.getSigner();
  } catch (error) {
    console.error('Error getting signer:', error);
    throw error;
  }
};

// Get contract instances based on the current network
export const getContracts = async () => {
  try {
    const provider = getProvider();
    console.log('Getting network information...');
    const network = await provider.getNetwork();
    const chainId = network.chainId.toString();
    
    console.log('Connected to network:', {
      chainId,
      name: network.name
    });
    
    // Check if the current network is supported
    if (!contractConfig[chainId]) {
      console.error(`Unsupported network: ${chainId}. Please switch to a supported network.`);
      console.log('Available networks:', Object.keys(contractConfig));
      throw new Error(`Unsupported network: ${chainId}. Please switch to a supported network.`);
    }
    
    const config = contractConfig[chainId];
    console.log('Using contract config:', {
      votingContract: config.votingContract,
      tokenContract: config.tokenContract
    });
    
    // Check if the contract addresses are valid
    if (!ethers.isAddress(config.votingContract) || !ethers.isAddress(config.tokenContract)) {
      throw new Error(`Invalid contract addresses for network ${chainId}. Please check your configuration.`);
    }
    
    const votingContract = new ethers.Contract(
      config.votingContract,
      VOTING_ABI,
      provider
    );
    
    const tokenContract = new ethers.Contract(
      config.tokenContract,
      GOVERNANCE_TOKEN_ABI,
      provider
    );
    
    console.log('Contracts initialized successfully');
    return { votingContract, tokenContract, provider };
  } catch (error) {
    console.error('Error getting contracts:', error);
    throw error;
  }
};

// Get signer versions of contracts for transactions
export const getSignerContracts = async () => {
  try {
    const { votingContract, tokenContract } = await getContracts();
    const signer = await getSigner();
    
    return {
      votingContract: votingContract.connect(signer),
      tokenContract: tokenContract.connect(signer),
      signer
    };
  } catch (error) {
    console.error('Error getting signer contracts:', error);
    throw error;
  }
};

// Get token balance of an address
export const getTokenBalance = async (address: string): Promise<string> => {
  try {
    const tokenContract = await getContracts().then(contracts => contracts.tokenContract);
    const balance = await tokenContract.balanceOf(address);
    return ethers.formatEther(balance);
  } catch (error) {
    console.error('Error getting token balance:', error);
    throw error;
  }
};

// Get all proposals
export const getProposals = async (): Promise<Proposal[]> => {
  try {
    if (!VOTING_CONTRACT_ADDRESS) {
      throw new Error('Voting contract address is not configured. Please deploy the contract first.');
    }
    
    const contract = await getContracts().then(contracts => contracts.votingContract);
    const userAddress = (await (await getSigner()).getAddress()).toLowerCase();
    
    // Get total number of proposals
    const count = await contract.getProposalCount();
    const proposals: Proposal[] = [];
    
    // Fetch each proposal
    for (let i = 1; i <= count; i++) {
      // Get proposal details
      const [
        title,
        description,
        forVotes,
        againstVotes,
        abstainVotes,
        startTime,
        endTime,
        currentState
      ] = await contract.getProposal(i);
      
      // Get user's vote on this proposal
      const [hasVoted, userVote, userVoteWeight] = await contract.hasVoted(i, userAddress);
      
      proposals.push({
        id: i,
        title,
        description,
        proposer: '', // We could get this by listening to events, but omitting for simplicity
        forVotes: Number(ethers.formatEther(forVotes)),
        againstVotes: Number(ethers.formatEther(againstVotes)),
        abstainVotes: Number(ethers.formatEther(abstainVotes)),
        startTime: new Date(Number(startTime) * 1000),
        endTime: new Date(Number(endTime) * 1000),
        state: Number(currentState),
        hasVoted,
        userVote: Number(userVote),
        userVoteWeight: Number(ethers.formatEther(userVoteWeight))
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
    const contract = await getSignerContracts().then(contracts => contracts.votingContract);
    const tx = await (contract as any).createProposal(title, description, durationInDays);
    
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
export const castVote = async (proposalId: number, support: VoteType): Promise<void> => {
  try {
    const contract = await getSignerContracts().then(contracts => contracts.votingContract);
    const tx = await (contract as any).castVote(proposalId, support);
    await tx.wait();
  } catch (error) {
    console.error(`Error voting on proposal ${proposalId}:`, error);
    throw error;
  }
};

// Execute a proposal
export const executeProposal = async (proposalId: number): Promise<void> => {
  try {
    const contract = await getSignerContracts().then(contracts => contracts.votingContract);
    const tx = await (contract as any).executeProposal(proposalId);
    await tx.wait();
  } catch (error) {
    console.error(`Error executing proposal ${proposalId}:`, error);
    throw error;
  }
};

// Cancel a proposal
export const cancelProposal = async (proposalId: number): Promise<void> => {
  try {
    const contract = await getSignerContracts().then(contracts => contracts.votingContract);
    const tx = await (contract as any).cancelProposal(proposalId);
    await tx.wait();
  } catch (error) {
    console.error(`Error canceling proposal ${proposalId}:`, error);
    throw error;
  }
};

// Delegate votes to another address
export const delegateVotes = async (delegateeAddress: string): Promise<void> => {
  try {
    const contract = await getSignerContracts().then(contracts => contracts.votingContract);
    const tx = await (contract as any).delegate(delegateeAddress);
    await tx.wait();
  } catch (error) {
    console.error(`Error delegating votes to ${delegateeAddress}:`, error);
    throw error;
  }
};

// Remove vote delegation
export const undelegate = async (): Promise<void> => {
  try {
    const contract = await getSignerContracts().then(contracts => contracts.votingContract);
    const tx = await (contract as any).undelegate();
    await tx.wait();
  } catch (error) {
    console.error('Error removing delegation:', error);
    throw error;
  }
};

// Mint governance tokens (for admin only)
export const mintTokens = async (receiverAddress: string, amount: string): Promise<void> => {
  try {
    const { tokenContract, signer } = await getSignerContracts();
    
    // Parse amount to wei (18 decimals)
    const amountInWei = ethers.parseUnits(amount, 18);
    
    // Log for debugging
    console.log('Attempting to mint tokens:', {
      to: receiverAddress,
      amount: amountInWei.toString(),
      signer: await signer.getAddress()
    });
    
    // Execute the mint transaction (using 'any' type assertion because the contract interface may vary)
    const tx = await (tokenContract as any).mint(receiverAddress, amountInWei);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    console.log('Mint transaction confirmed:', receipt.hash);
  } catch (error: any) {
    console.error('Error minting tokens:', error);
    
    // Provide more specific error messages based on common issues
    if (error.message.includes('user rejected transaction')) {
      throw new Error('Transaction was rejected by the user.');
    } else if (error.message.includes('insufficient funds')) {
      throw new Error('Insufficient funds to complete the transaction.');
    } else if (error.message.includes('execution reverted')) {
      throw new Error('Transaction reverted: you may not have permission to mint tokens.');
    } else if (error.message.includes('mint is not a function')) {
      throw new Error('The mint function is not available on this contract. Please check the contract ABI.');
    } else {
      throw error;
    }
  }
}; 