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
import logger from '@/utils/logger';
import { getContract } from './web3Service';
import { getProposalFromFirebase } from './firebaseService';

// Error types for better error classification
export enum ContractErrorType {
  PROVIDER_NOT_FOUND = 'PROVIDER_NOT_FOUND',
  NETWORK_UNSUPPORTED = 'NETWORK_UNSUPPORTED',
  USER_REJECTED = 'USER_REJECTED',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  CONTRACT_ERROR = 'CONTRACT_ERROR',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// Custom error class for contract service errors
export class ContractServiceError extends Error {
  type: ContractErrorType;
  originalError?: any;

  constructor(message: string, type: ContractErrorType, originalError?: any) {
    super(message);
    this.name = 'ContractServiceError';
    this.type = type;
    this.originalError = originalError;
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ContractServiceError);
    }
  }
}

// Helper function to classify errors
const classifyError = (error: any): ContractServiceError => {
  const message = error?.message || 'Unknown error occurred';
  
  // User rejected transaction
  if (message.includes('user rejected') || message.includes('User denied')) {
    return new ContractServiceError(
      'Transaction was rejected by the user',
      ContractErrorType.USER_REJECTED,
      error
    );
  }
  
  // Insufficient funds
  if (message.includes('insufficient funds')) {
    return new ContractServiceError(
      'Insufficient funds to complete the transaction',
      ContractErrorType.INSUFFICIENT_FUNDS,
      error
    );
  }
  
  // Permissions/access control error
  if (
    message.includes('execution reverted') && 
    (message.includes('AccessControl') || message.includes('Ownable') || message.includes('permission'))
  ) {
    return new ContractServiceError(
      'You do not have permission to perform this action',
      ContractErrorType.INSUFFICIENT_PERMISSIONS,
      error
    );
  }
  
  // Contract execution error
  if (message.includes('execution reverted')) {
    const revertReason = message.includes(':') 
      ? message.split(':').pop()?.trim() 
      : 'Contract reverted without a reason';
      
    return new ContractServiceError(
      `Contract execution failed: ${revertReason}`,
      ContractErrorType.CONTRACT_ERROR,
      error
    );
  }
  
  // Network error
  if (
    message.includes('network error') || 
    message.includes('timeout') || 
    message.includes('connection') ||
    message.includes('failed to fetch')
  ) {
    return new ContractServiceError(
      'Network error occurred. Please check your internet connection',
      ContractErrorType.NETWORK_ERROR,
      error
    );
  }
  
  // Unknown error
  return new ContractServiceError(
    message,
    ContractErrorType.UNKNOWN_ERROR,
    error
  );
};

// Get the Ethereum provider
export const getProvider = () => {
  try {
    if (typeof window !== 'undefined' && window.ethereum) {
      logger.debug('Getting Ethereum provider from window.ethereum');
      return new ethers.BrowserProvider(window.ethereum);
    }
    
    throw new ContractServiceError(
      'Ethereum provider not found. Please install MetaMask or use a compatible browser',
      ContractErrorType.PROVIDER_NOT_FOUND
    );
  } catch (error) {
    logger.error('Error getting provider:', error);
    
    if (error instanceof ContractServiceError) {
      throw error;
    }
    
    throw classifyError(error);
  }
};

// Get the signer for transactions
export const getSigner = async () => {
  try {
    const provider = getProvider();
    logger.debug('Getting signer from provider');
    return await provider.getSigner();
  } catch (error) {
    logger.error('Error getting signer:', error);
    
    if (error instanceof ContractServiceError) {
      throw error;
    }
    
    if (String(error).includes('user rejected action')) {
      throw new ContractServiceError(
        'Please connect your wallet to continue',
        ContractErrorType.USER_REJECTED,
        error
      );
    }
    
    throw classifyError(error);
  }
};

// Get contract instances based on the current network
export const getContracts = async () => {
  try {
    const provider = getProvider();
    logger.debug('Getting network information...');
    const network = await provider.getNetwork();
    const chainId = network.chainId.toString();
    
    logger.debug('Connected to network:', {
      chainId,
      name: network.name
    });
    
    // Check if the current network is supported
    if (!contractConfig[chainId]) {
      const supportedNetworks = Object.keys(contractConfig).join(', ');
      throw new ContractServiceError(
        `Network with Chain ID ${chainId} is not supported. Please switch to one of these networks: ${supportedNetworks}`,
        ContractErrorType.NETWORK_UNSUPPORTED
      );
    }
    
    const config = contractConfig[chainId];
    logger.debug('Using contract config:', {
      votingContract: config.votingContract,
      tokenContract: config.tokenContract
    });
    
    // Check if the contract addresses are valid
    if (!ethers.isAddress(config.votingContract) || !ethers.isAddress(config.tokenContract)) {
      throw new ContractServiceError(
        `Invalid contract addresses for network ${chainId}. Please check your configuration`,
        ContractErrorType.INVALID_ADDRESS
      );
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
    
    logger.debug('Contracts initialized successfully');
    return { votingContract, tokenContract, provider };
  } catch (error) {
    logger.error('Error getting contracts:', error);
    
    if (error instanceof ContractServiceError) {
      throw error;
    }
    
    throw classifyError(error);
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
    logger.error('Error getting signer contracts:', error);
    
    if (error instanceof ContractServiceError) {
      throw error;
    }
    
    throw classifyError(error);
  }
};

// Get token balance of an address
export const getTokenBalance = async (address: string): Promise<string> => {
  try {
    if (!ethers.isAddress(address)) {
      throw new ContractServiceError(
        'Invalid Ethereum address format',
        ContractErrorType.INVALID_ADDRESS
      );
    }
    
    const tokenContract = await getContracts().then(contracts => contracts.tokenContract);
    const balance = await tokenContract.balanceOf(address);
    return ethers.formatEther(balance);
  } catch (error) {
    logger.error('Error getting token balance:', error);
    
    if (error instanceof ContractServiceError) {
      throw error;
    }
    
    throw classifyError(error);
  }
};

// Get a single proposal by ID
export const getProposal = async (proposalId: number, userAddress?: string | null): Promise<any> => {
  try {
    logger.debug(`Getting proposal ${proposalId}`);
    
    if (isNaN(proposalId) || proposalId <= 0) {
      throw new ContractServiceError(
        'Invalid proposal ID. Must be a positive number',
        ContractErrorType.INVALID_ADDRESS
      );
    }
    
    const { votingContract } = await getContracts();
    
    // Get proposal details from contract
    try {
      const [
        title,
        description,
        forVotes,
        againstVotes,
        abstainVotes,
        startTime,
        endTime,
        currentState
      ] = await (votingContract as any).getProposal(proposalId);
      
      // Get user's vote on this proposal if user address is provided
      let hasVoted = false;
      let userVote = 0;
      let userVoteWeight = 0;
      
      if (userAddress && ethers.isAddress(userAddress) && userAddress !== ethers.ZeroAddress) {
        try {
          const [voted, vote, weight] = await (votingContract as any).hasVoted(proposalId, userAddress);
          hasVoted = voted;
          userVote = Number(vote);
          userVoteWeight = Number(ethers.formatUnits(weight, 18));
        } catch (voteError) {
          logger.warn(`Error fetching user vote for proposal ${proposalId}:`, voteError);
          // Continue without user vote data
        }
      }
      
      // Get proposer from Firebase or other metadata source if needed
      let proposer = '';
      try {
        const firebaseData = await getProposalFromFirebase(proposalId);
        if (firebaseData && firebaseData.proposer) {
          proposer = firebaseData.proposer;
        }
      } catch (metadataError) {
        logger.warn(`Error fetching proposal metadata for ${proposalId}:`, metadataError);
        // Continue without metadata
      }
      
      // Check if a proposal in Succeeded state has expired (passed but not executed)
      let isExpired = false;
      if (Number(currentState) === ProposalState.Succeeded) {
        // Get the execution deadline (7 days after voting ends)
        const now = new Date();
        const executionDeadline = new Date(Number(endTime) * 1000);
        executionDeadline.setDate(executionDeadline.getDate() + 7);
        
        isExpired = now > executionDeadline;
      }
      
      return {
        id: proposalId,
        title,
        description,
        proposer,
        forVotes: Number(ethers.formatUnits(forVotes, 18)),
        againstVotes: Number(ethers.formatUnits(againstVotes, 18)),
        abstainVotes: Number(ethers.formatUnits(abstainVotes, 18)),
        startTime: new Date(Number(startTime) * 1000),
        endTime: new Date(Number(endTime) * 1000),
        state: Number(currentState),
        hasVoted,
        userVote,
        userVoteWeight,
        isExpired
      };
    } catch (error) {
      logger.error(`Error fetching proposal ${proposalId} from contract:`, error);
      throw new ContractServiceError(
        `Proposal with ID ${proposalId} not found or inaccessible`,
        ContractErrorType.CONTRACT_ERROR,
        error
      );
    }
  } catch (error) {
    logger.error(`Error getting proposal ${proposalId}:`, error);
    
    if (error instanceof ContractServiceError) {
      throw error;
    }
    
    throw classifyError(error);
  }
};

// Update the getProposals function to use our new getProposal function
export const getProposals = async (): Promise<any[]> => {
  try {
    logger.debug('Getting all proposals');
    
    const { votingContract } = await getContracts();
    
    // Try to get user address, but don't fail if not available
    let userAddress: string | null = null;
    try {
      const signer = await getSigner();
      userAddress = await signer.getAddress();
    } catch (error) {
      // If user isn't connected, we'll still show proposals but without user vote info
      logger.warn('Unable to get user address for proposal query:', error);
      userAddress = null;
    }
    
    // Get total number of proposals
    const count = await (votingContract as any).getProposalCount();
    const proposals: any[] = [];
    
    // Fetch each proposal
    for (let i = 1; i <= count; i++) {
      try {
        const proposal = await getProposal(i, userAddress);
        proposals.push(proposal);
      } catch (proposalError) {
        logger.error(`Error fetching proposal ${i}:`, proposalError);
        // Continue to next proposal rather than failing the entire request
      }
    }
    
    return proposals;
  } catch (error) {
    logger.error('Error getting proposals:', error);
    
    if (error instanceof ContractServiceError) {
      throw error;
    }
    
    throw classifyError(error);
  }
};

// Check if a proposal has expired
export const checkProposalExpiration = async (proposalId: number): Promise<boolean> => {
  try {
    logger.debug(`Checking expiration for proposal ${proposalId}`);
    
    const proposal = await getProposal(proposalId);
    return proposal.isExpired === true;
  } catch (error) {
    logger.error(`Error checking proposal expiration:`, error);
    
    if (error instanceof ContractServiceError) {
      throw error;
    }
    
    throw classifyError(error);
  }
};

// Expire a proposal that passed but wasn't executed within the timeframe
export const expireProposal = async (proposalId: number): Promise<boolean> => {
  try {
    logger.debug(`Expiring proposal ${proposalId}`);
    
    // Verify the proposal is actually eligible for expiration
    const isExpired = await checkProposalExpiration(proposalId);
    
    if (!isExpired) {
      throw new ContractServiceError(
        'This proposal is not eligible for expiration',
        ContractErrorType.CONTRACT_ERROR
      );
    }
    
    const { votingContract } = await getSignerContracts();
    
    // Call the contract's expireProposal function
    try {
      const tx = await (votingContract as any).expireProposal(proposalId);
      await tx.wait();
      
      logger.debug(`Proposal ${proposalId} expired successfully`);
      return true;
    } catch (contractError) {
      // If the contract doesn't have a dedicated expireProposal function,
      // we might need to use a generic update function or throw an error
      logger.error('Contract does not support the expireProposal function', contractError);
      throw new ContractServiceError(
        'The contract does not support proposal expiration',
        ContractErrorType.CONTRACT_ERROR,
        contractError
      );
    }
  } catch (error) {
    logger.error(`Error expiring proposal:`, error);
    
    if (error instanceof ContractServiceError) {
      throw error;
    }
    
    throw classifyError(error);
  }
};

// Create a new proposal
export const createProposal = async (
  title: string,
  description: string,
  durationInDays: number
): Promise<number> => {
  try {
    // Validate inputs
    if (!title || title.trim().length === 0) {
      throw new ContractServiceError(
        'Proposal title cannot be empty',
        ContractErrorType.INVALID_ADDRESS
      );
    }
    
    if (!description || description.trim().length === 0) {
      throw new ContractServiceError(
        'Proposal description cannot be empty',
        ContractErrorType.INVALID_ADDRESS
      );
    }
    
    if (durationInDays <= 0 || durationInDays > 30) {
      throw new ContractServiceError(
        'Proposal duration must be between 1 and 30 days',
        ContractErrorType.INVALID_ADDRESS
      );
    }
    
    const contract = await getSignerContracts().then(contracts => contracts.votingContract);
    
    // Check if the user has enough voting power to create a proposal
    try {
      const signer = await getSigner();
      const userAddress = await signer.getAddress();
      const votingPower = await (contract as any).getVotes(userAddress);
      
      // Convert to number for comparison (assuming minimum 1.0 tokens needed)
      const votingPowerNumber = Number(ethers.formatEther(votingPower));
      
      if (votingPowerNumber < 1.0) {
        throw new ContractServiceError(
          `Insufficient voting power (${votingPowerNumber.toFixed(2)}). You need at least 1.0 tokens to create a proposal`,
          ContractErrorType.INSUFFICIENT_PERMISSIONS
        );
      }
    } catch (powerError) {
      if (powerError instanceof ContractServiceError) {
        throw powerError;
      }
      
      logger.warn('Error checking voting power:', powerError);
      // Continue anyway, the contract will revert if not enough power
    }
    
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
    
    if (!event) {
      throw new ContractServiceError(
        'Failed to extract proposal ID from transaction receipt',
        ContractErrorType.CONTRACT_ERROR
      );
    }
    
    return Number(event[0]);
  } catch (error) {
    logger.error('Error creating proposal:', error);
    
    if (error instanceof ContractServiceError) {
      throw error;
    }
    
    throw classifyError(error);
  }
};

// Cast a vote on a proposal with quadratic voting (power = sqrt(tokens))
export const castQuadraticVote = async (proposalId: number, support: VoteType): Promise<boolean> => {
  try {
    logger.debug(`Casting quadratic vote on proposal ${proposalId}`);
    
    const { votingContract, tokenContract, signer } = await getSignerContracts();
    const tokenContractAny = tokenContract as any;
    const votingContractAny = votingContract as any;
    const voterAddress = await signer.getAddress();
    
    // Get user's token balance
    const balance = await tokenContractAny.balanceOf(voterAddress);
    
    if (balance.isZero()) {
      throw new ContractServiceError(
        'You need governance tokens to vote',
        ContractErrorType.INSUFFICIENT_FUNDS
      );
    }
    
    // Calculate quadratic voting power (sqrt of token balance)
    // Note: We use fixed-point math with 18 decimals for token balance
    const tokenBalance = parseFloat(ethers.formatUnits(balance, 18));
    const quadraticPower = Math.floor(Math.sqrt(tokenBalance) * 100) / 100; // Keep 2 decimal places
    
    // We'll use a custom implementation of quadratic voting using Firebase
    const { getProposalFromFirebase, updateProposalVotes } = await import('./firebaseService');
    
    // First check if user has already voted
    const hasVoted = await votingContractAny.hasVoted(proposalId, voterAddress);
    
    if (hasVoted[0]) {
      throw new ContractServiceError(
        'You have already voted on this proposal',
        ContractErrorType.CONTRACT_ERROR
      );
    }
    
    // Get current proposal data
    const proposal = await getProposalFromFirebase(proposalId);
    
    if (!proposal) {
      throw new ContractServiceError(
        'Proposal not found',
        ContractErrorType.CONTRACT_ERROR
      );
    }
    
    // Update vote counts based on support type
    let updatedProposal = { ...proposal };
    
    if (support === VoteType.For) {
      updatedProposal.forVotes += quadraticPower;
    } else if (support === VoteType.Against) {
      updatedProposal.againstVotes += quadraticPower;
    } else if (support === VoteType.Abstain) {
      updatedProposal.abstainVotes += quadraticPower;
    }
    
    // Save the user's vote using type assertion
    const proposalWithVotes = updatedProposal as any;
    proposalWithVotes.votes = proposalWithVotes.votes || [];
    proposalWithVotes.votes.push({
      voter: voterAddress,
      support,
      weight: quadraticPower,
      timestamp: Date.now()
    });
    
    // Save updated proposal
    await updateProposalVotes(proposalWithVotes);
    
    // Also cast a vote on the blockchain for compatibility, but it won't use the quadratic weight
    // This maintains blockchain voting state for analytics and contract state tracking
    const tx = await votingContractAny.castVote(proposalId, support);
    await tx.wait();
    
    logger.debug(`Successfully cast quadratic vote on proposal ${proposalId}`);
    return true;
  } catch (error) {
    logger.error(`Error casting quadratic vote on proposal ${proposalId}:`, error);
    
    if (error instanceof ContractServiceError) {
      throw error;
    }
    
    throw classifyError(error);
  }
};

// Helper function to get human-readable proposal state
const getProposalStateText = (state: ProposalState): string => {
  const states = [
    'Pending',
    'Active',
    'Canceled',
    'Defeated',
    'Succeeded',
    'Executed',
    'Expired'
  ];
  
  return states[state] || 'Unknown';
};

// Enhanced on-chain proposal execution with transaction verification
export const executeProposalOnChain = async (proposalId: number, transactionData?: string): Promise<boolean> => {
  try {
    logger.debug(`Executing proposal ${proposalId} on-chain`);
    
    if (isNaN(proposalId) || proposalId <= 0) {
      throw new ContractServiceError(
        'Invalid proposal ID. Must be a positive number',
        ContractErrorType.INVALID_ADDRESS
      );
    }
    
    // Check proposal state first
    const proposal = await getProposal(proposalId);
    
    if (!proposal) {
      throw new ContractServiceError(
        `Proposal with ID ${proposalId} not found`,
        ContractErrorType.INVALID_ADDRESS
      );
    }
    
    if (proposal.state !== ProposalState.Succeeded) {
      throw new ContractServiceError(
        `Cannot execute proposal: ${getProposalStateText(proposal.state)}. Only Succeeded proposals can be executed`,
        ContractErrorType.CONTRACT_ERROR
      );
    }
    
    if (proposal.isExpired) {
      throw new ContractServiceError(
        'This proposal has expired and cannot be executed',
        ContractErrorType.CONTRACT_ERROR
      );
    }
    
    const { votingContract, signer } = await getSignerContracts();
    const userAddress = await signer.getAddress();
    
    // Verify executor permissions (if needed)
    // This is an optional step depending on your governance design
    try {
      // Example: Check if user has execution role or is contract owner
      const isExecutor = await (votingContract as any).hasRole(
        await (votingContract as any).EXECUTOR_ROLE(),
        userAddress
      );
      
      if (!isExecutor) {
        // If specific role check fails, check if user has minimum tokens for execution
        const minTokensToExecute = ethers.parseEther("10"); // Example: 10 tokens
        const { tokenContract } = await getContracts();
        const balance = await tokenContract.balanceOf(userAddress);
        
        if (balance < minTokensToExecute) {
          throw new ContractServiceError(
            'You need at least 10 tokens to execute proposals',
            ContractErrorType.INSUFFICIENT_PERMISSIONS
          );
        }
      }
    } catch (permissionError) {
      // If the specific role check fails but it's just because the contract doesn't 
      // have that function, continue anyway - the contract will revert if not permitted
      logger.warn('Error checking execution permissions:', permissionError);
    }
    
    // Execute the proposal with optional transaction data
    // This allows for more complex on-chain actions
    let tx;
    if (transactionData) {
      // If transaction data is provided, use it for more complex execution
      tx = await (votingContract as any).executeProposalWithData(proposalId, transactionData);
    } else {
      // Use standard execution
      tx = await (votingContract as any).executeProposal(proposalId);
    }
    
    // Wait for confirmation
    const receipt = await tx.wait();
    
    // Verify success through events
    const successEvent = receipt.logs
      .find((log: any) => {
        try {
          const parsedLog = (votingContract as any).interface.parseLog({
            topics: [...log.topics],
            data: log.data,
          });
          return parsedLog?.name === 'ProposalExecuted';
        } catch {
          return false;
        }
      });
    
    if (!successEvent) {
      logger.warn('Proposal execution transaction succeeded but no success event found');
    }
    
    // Update Firebase record
    try {
      const { getProposalFromFirebase, updateProposalVotes } = await import('./firebaseService');
      const firebaseProposal = await getProposalFromFirebase(proposalId);
      if (firebaseProposal) {
        // Mark as executed in Firebase
        const updatedProposal = {
          ...firebaseProposal,
          executed: true,
          executedAt: Date.now(),
          executor: userAddress
        };
        await updateProposalVotes(updatedProposal);
      }
    } catch (firebaseError) {
      logger.warn('Error updating Firebase after execution:', firebaseError);
    }
    
    logger.debug(`Proposal ${proposalId} executed successfully on-chain`);
    return true;
  } catch (error) {
    logger.error(`Error executing proposal ${proposalId} on-chain:`, error);
    
    if (error instanceof ContractServiceError) {
      throw error;
    }
    
    throw classifyError(error);
  }
};

// Cancel a proposal
export const cancelProposal = async (proposalId: number): Promise<void> => {
  try {
    if (isNaN(proposalId) || proposalId <= 0) {
      throw new ContractServiceError(
        'Invalid proposal ID. Must be a positive number',
        ContractErrorType.INVALID_ADDRESS
      );
    }
    
    const contract = await getSignerContracts().then(contracts => contracts.votingContract);
    
    // Check if the proposal exists and can be canceled
    try {
      const proposals = await getProposals();
      const proposal = proposals.find(p => p.id === proposalId);
      
      if (!proposal) {
        throw new ContractServiceError(
          `Proposal with ID ${proposalId} does not exist`,
          ContractErrorType.INVALID_ADDRESS
        );
      }
      
      if (proposal.state !== ProposalState.Pending && proposal.state !== ProposalState.Active) {
        throw new ContractServiceError(
          `Cannot cancel proposal: ${getProposalStateText(proposal.state)}. Only Pending or Active proposals can be canceled`,
          ContractErrorType.CONTRACT_ERROR
        );
      }
    } catch (checkError) {
      if (checkError instanceof ContractServiceError) {
        throw checkError;
      }
      logger.warn('Error checking proposal status:', checkError);
      // Continue anyway, the contract will revert if there's an issue
    }
    
    // Cancel the proposal
    const tx = await (contract as any).cancelProposal(proposalId);
    await tx.wait();
  } catch (error) {
    logger.error(`Error canceling proposal ${proposalId}:`, error);
    
    if (error instanceof ContractServiceError) {
      throw error;
    }
    
    throw classifyError(error);
  }
};

// Get delegation status for a user
export const getDelegationStatus = async (address: string): Promise<{ isDelegating: boolean; delegatedTo: string; votingPower: string }> => {
  try {
    logger.debug('Getting delegation status for:', address);
    
    if (!ethers.isAddress(address)) {
      throw new ContractServiceError(
        'Invalid address format',
        ContractErrorType.INVALID_ADDRESS
      );
    }
    
    const { tokenContract } = await getContracts();
    const tokenContractAny = tokenContract as any;
    
    // Default values
    const result = {
      isDelegating: false,
      delegatedTo: ethers.ZeroAddress,
      votingPower: '0'
    };
    
    try {
      // First check Firebase for delegation data
      const { getDelegationByDelegator } = await import('./firebaseService');
      const firebaseDelegation = await getDelegationByDelegator(address);
      
      if (firebaseDelegation && firebaseDelegation.active) {
        result.isDelegating = true;
        result.delegatedTo = firebaseDelegation.delegatee;
        logger.debug('Found active delegation in Firebase:', firebaseDelegation);
      }
      
      // If not found in Firebase, check on-chain
      if (!result.isDelegating) {
        // Try to get voting power via delegates function first
        if (typeof tokenContractAny.delegates === 'function') {
          try {
            const delegatee = await tokenContractAny.delegates(address);
            
            // If the address is delegating to someone other than themselves and not the zero address
            if (delegatee !== ethers.ZeroAddress && delegatee.toLowerCase() !== address.toLowerCase()) {
              result.isDelegating = true;
              result.delegatedTo = delegatee;
            }
          } catch (delegatesError) {
            logger.debug('delegates function failed, falling back to alternative method:', delegatesError);
            // Continue with alternative method
          }
        }
      }
      
      // Get token balance
      const balance = await tokenContractAny.balanceOf(address);
      const balanceFormatted = ethers.formatUnits(balance, 18);
      
      // Try to get voting power via getVotes if available
      if (typeof tokenContractAny.getVotes === 'function') {
        try {
          const votes = await tokenContractAny.getVotes(address);
          result.votingPower = ethers.formatUnits(votes, 18);
        } catch (getVotesError) {
          logger.debug('getVotes function failed:', getVotesError);
          
          // If getVotes fails, we'll use the balance as voting power if not delegating
          if (!result.isDelegating) {
            result.votingPower = balanceFormatted;
          }
        }
      } else {
        // If getVotes doesn't exist, use balance as voting power if not delegating
        if (!result.isDelegating) {
          result.votingPower = balanceFormatted;
        }
      }
      
      logger.debug('Delegation status result:', result);
      return result;
    } catch (error) {
      logger.error('Error in delegation status check:', error);
      // Return default values but don't throw error to not break the UI
      return result;
    }
  } catch (error) {
    logger.error('Error getting delegation status:', error);
    
    if (error instanceof ContractServiceError) {
      throw error;
    }
    
    throw classifyError(error);
  }
};

// Delegate votes to another address
export const delegateVotes = async (delegateeAddress: string): Promise<boolean> => {
  try {
    logger.debug('Delegating votes to:', delegateeAddress);
    
    // Validate delegatee address
    if (!ethers.isAddress(delegateeAddress)) {
      throw new ContractServiceError(
        'Invalid delegatee address format',
        ContractErrorType.INVALID_ADDRESS
      );
    }
    
    const { tokenContract, signer } = await getSignerContracts();
    const tokenContractAny = tokenContract as any;
    const userAddress = await signer.getAddress();
    
    // Prevent self-delegation
    if (delegateeAddress.toLowerCase() === userAddress.toLowerCase()) {
      throw new ContractServiceError(
        'You cannot delegate to yourself',
        ContractErrorType.CONTRACT_ERROR
      );
    }
    
    // Check if user has tokens to delegate
    const balance = await tokenContractAny.balanceOf(userAddress);
    if (balance <= 0) {
      throw new ContractServiceError(
        'You need to have tokens to delegate voting power',
        ContractErrorType.INSUFFICIENT_FUNDS
      );
    }
    
    // Import the Firebase service here to avoid circular dependencies
    const { 
      saveDelegation, 
      getDelegationByDelegator,
      createNotification,
      NotificationType
    } = await import('./firebaseService');

    // Check if user already delegated
    const existingDelegation = await getDelegationByDelegator(userAddress);
    
    // Save delegation in Firebase
    await saveDelegation({
      delegator: userAddress,
      delegatee: delegateeAddress,
      amount: ethers.formatUnits(balance, 18),
      active: true,
      timestamp: Date.now()
    });
    
    logger.debug('Delegation saved to database');
    
    // Also try to delegate on-chain if the ERC20 token supports it
    try {
      if (typeof tokenContractAny.delegate === 'function') {
        // If the token supports ERC20Votes standard
        const tx = await tokenContractAny.delegate(delegateeAddress);
        await tx.wait();
        logger.debug('On-chain delegation successful');
      }
    } catch (contractError) {
      // This is not critical, as we're primarily using Firebase for delegation
      logger.warn('On-chain delegation failed (this is okay):', contractError);
    }
    
    // Create notification for the delegatee
    try {
      await createNotification({
        userId: delegateeAddress.toLowerCase(),
        type: NotificationType.DELEGATION_RECEIVED,
        title: "Voting Power Received",
        message: `You have received voting power delegation from ${userAddress}`,
        linkUrl: "/delegates",
        read: false,
        timestamp: Date.now(),
        data: { delegator: userAddress, amount: ethers.formatUnits(balance, 18) }
      });
    } catch (notificationError) {
      logger.warn('Error creating delegation notification:', notificationError);
    }
    
    return true;
  } catch (error) {
    logger.error('Error delegating votes:', error);
    
    if (error instanceof ContractServiceError) {
      throw error;
    }
    
    throw classifyError(error);
  }
};

// Undelegate votes (delegate back to yourself)
export const undelegateVotes = async (): Promise<boolean> => {
  try {
    logger.debug('Undelegating votes');
    
    const { signer } = await getSignerContracts();
    const userAddress = await signer.getAddress();
    
    // Check current delegation status
    const { isDelegating } = await getDelegationStatus(userAddress);
    
    if (!isDelegating) {
      throw new ContractServiceError(
        'You are not currently delegating your votes',
        ContractErrorType.CONTRACT_ERROR
      );
    }
    
    // Since our GovernanceToken doesn't implement ERC20Votes, we'll implement
    // a custom undelegation using Firebase

    // Import the Firebase service here to avoid circular dependencies
    const { saveDelegation, getDelegationByDelegator } = await import('./firebaseService');
    
    // Get the existing delegation
    const existingDelegation = await getDelegationByDelegator(userAddress);
    
    if (existingDelegation) {
      // Deactivate the delegation
      await saveDelegation({
        ...existingDelegation,
        active: false,
        timestamp: Date.now()
      });
      
      logger.debug('Delegation removed from database');
      return true;
    }
    
    throw new ContractServiceError(
      'No active delegation found',
      ContractErrorType.CONTRACT_ERROR
    );
  } catch (error) {
    logger.error('Error undelegating votes:', error);
    
    if (error instanceof ContractServiceError) {
      throw error;
    }
    
    throw classifyError(error);
  }
};

// Mint governance tokens (for admin only)
export const mintTokens = async (receiverAddress: string, amount: string): Promise<void> => {
  try {
    // Validate inputs
    if (!ethers.isAddress(receiverAddress)) {
      throw new ContractServiceError(
        'Invalid receiver address format',
        ContractErrorType.INVALID_ADDRESS
      );
    }
    
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new ContractServiceError(
        'Invalid amount. Must be a positive number',
        ContractErrorType.INVALID_ADDRESS
      );
    }
    
    const { tokenContract, signer } = await getSignerContracts();
    
    // Parse amount to wei (18 decimals)
    const amountInWei = ethers.parseUnits(amount, 18);
    
    // Log for debugging
    logger.debug('Attempting to mint tokens:', {
      to: receiverAddress,
      amount: amountInWei.toString(),
      signer: await signer.getAddress()
    });
    
    // Check if the user has admin/minter role
    try {
      const signerAddress = await signer.getAddress();
      const minterRole = await (tokenContract as any).MINTER_ROLE();
      const hasRole = await (tokenContract as any).hasRole(minterRole, signerAddress);
      
      if (!hasRole) {
        throw new ContractServiceError(
          'You do not have permission to mint tokens. Only accounts with the MINTER_ROLE can mint',
          ContractErrorType.INSUFFICIENT_PERMISSIONS
        );
      }
    } catch (roleError) {
      if (roleError instanceof ContractServiceError) {
        throw roleError;
      }
      
      logger.warn('Error checking minter role:', roleError);
      // Continue anyway, the contract will revert if no permission
    }
    
    // Execute the mint transaction (using 'any' type assertion because the contract interface may vary)
    const tx = await (tokenContract as any).mint(receiverAddress, amountInWei);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    logger.info('Mint transaction confirmed:', receipt.hash);
  } catch (error: any) {
    logger.error('Error minting tokens:', error);
    
    if (error instanceof ContractServiceError) {
      throw error;
    }
    
    if (error.message?.includes('mint is not a function')) {
      throw new ContractServiceError(
        'The mint function is not available on this contract. Please check the contract ABI',
        ContractErrorType.CONTRACT_ERROR,
        error
      );
    }
    
    throw classifyError(error);
  }
};

// Get voting power for an address
export const getVotingPower = async (address: string): Promise<string> => {
  try {
    if (!ethers.isAddress(address)) {
      throw new ContractServiceError(
        'Invalid address format',
        ContractErrorType.INVALID_ADDRESS
      );
    }
    
    const { tokenContract } = await getContracts();
    const tokenContractAny = tokenContract as any;
    
    // First try to get the actual token balance which is more reliable
    try {
      const balance = await tokenContractAny.balanceOf(address);
      return ethers.formatEther(balance);
    } catch (balanceError) {
      logger.warn('Error getting balance, falling back to getVotes:', balanceError);
      
      // Fall back to getVotes if balanceOf fails
      const votingPower = await tokenContractAny.getVotes(address);
      return ethers.formatEther(votingPower);
    }
  } catch (error) {
    logger.error('Error getting voting power:', error);
    
    if (error instanceof ContractServiceError) {
      throw error;
    }
    
    throw classifyError(error);
  }
};

// Get all delegates that have voting power
export const getAllDelegates = async (): Promise<{ address: string; votingPower: string }[]> => {
  try {
    logger.debug('Fetching all delegates from the blockchain');
    const { votingContract, provider } = await getContracts();
    
    // Try to get delegation events for a more comprehensive list
    const delegates = new Set<string>();
    
    try {
      // Look for DelegateChanged events in recent blocks
      logger.debug('Looking for delegation events in recent blocks...');
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 10000); // Look back ~10000 blocks
      
      // Create a filter for the DelegateChanged event
      const filter = {
        address: (votingContract as any).target,
        fromBlock,
        toBlock: 'latest',
        topics: [
          ethers.id("DelegateChanged(address,address,address)") // Event signature hash
        ]
      };
      
      // Query the logs
      const logs = await provider.getLogs(filter);
      logger.debug(`Found ${logs.length} delegation events`);
      
      // Extract the delegatee addresses from the logs
      for (const log of logs) {
        try {
          const parsedLog = (votingContract as any).interface.parseLog({
            topics: [...log.topics],
            data: log.data,
          });
          
          if (parsedLog && parsedLog.args) {
            // The third parameter is the delegatee
            const delegatee = parsedLog.args[2];
            if (delegatee && delegatee !== ethers.ZeroAddress) {
              delegates.add(delegatee);
            }
          }
        } catch (error) {
          logger.warn('Error parsing event log:', error);
        }
      }
      
      logger.debug(`Extracted ${delegates.size} unique delegatee addresses from events`);
    } catch (error) {
      logger.warn('Error fetching delegation events:', error);
      // Continue with fallback approach
    }
    
    // Add test addresses to check (as a fallback)
    const testAddresses = [
      '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
      '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
      '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
    ];
    
    testAddresses.forEach(addr => delegates.add(addr));
    
    // Get user's connected address if available
    try {
      const userAddress = await getSigner().then(signer => signer.getAddress());
      if (userAddress) {
        delegates.add(userAddress);
      }
    } catch (error) {
      logger.warn('Could not get user address:', error);
      // Continue without user address
    }
    
    logger.debug(`Checking voting power for ${delegates.size} addresses`);
    
    // Check voting power for each address in parallel
    const delegatesArray = Array.from(delegates);
    const delegatesWithPower = await Promise.all(
      delegatesArray.map(async (address) => {
        try {
          const votes = await (votingContract as any).getVotes(address);
          const votingPower = ethers.formatEther(votes);
          
          return {
            address,
            votingPower
          };
        } catch (error) {
          logger.warn(`Error getting voting power for ${address}:`, error);
          return {
            address,
            votingPower: '0'
          };
        }
      })
    );
    
    // Filter delegates with voting power > 0 and sort by power (descending)
    return delegatesWithPower
      .filter(delegate => parseFloat(delegate.votingPower) > 0)
      .sort((a, b) => parseFloat(b.votingPower) - parseFloat(a.votingPower));
    
  } catch (error) {
    logger.error('Error fetching delegates:', error);
    
    if (error instanceof ContractServiceError) {
      throw error;
    }
    
    const classifiedError = classifyError(error);
    
    // For this specific function, we return an empty array instead of throwing
    // to prevent UI disruption, but we still log the error
    logger.error('Returning empty array due to error:', classifiedError);
    return [];
  }
};

// Get users who have delegated to a specific address
export const getDelegationsToAddress = async (delegateeAddress: string): Promise<{ address: string; votingPower: string }[]> => {
  try {
    if (!ethers.isAddress(delegateeAddress)) {
      throw new ContractServiceError(
        'Invalid delegatee address format',
        ContractErrorType.INVALID_ADDRESS
      );
    }
    
    logger.debug(`Fetching delegations to address: ${delegateeAddress}`);
    
    // Create a Map to store unique delegator addresses with their power
    const delegators = new Map<string, string>();
    
    // First check Firebase delegations (our custom implementation)
    try {
      const { getDelegationsToAddress: getFirebaseDelegations } = await import('./firebaseService');
      const firebaseDelegations = await getFirebaseDelegations(delegateeAddress);
      
      logger.debug(`Found ${firebaseDelegations.length} Firebase delegations to ${delegateeAddress}`);
      
      // Add Firebase delegations to our Map
      firebaseDelegations.forEach(delegation => {
        if (delegation.active) {
          delegators.set(delegation.delegator.toLowerCase(), delegation.amount);
        }
      });
    } catch (firebaseError) {
      logger.warn('Error fetching delegations from Firebase:', firebaseError);
    }
    
    // Also check on-chain delegations if available
    try {
      const { votingContract, provider } = await getContracts();
      
      // Look for DelegateChanged events where the target address is the delegatee
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 10000); // Look back ~10000 blocks
      
      // Create a filter for the DelegateChanged event with the delegatee as a parameter
      const filter = {
        address: (votingContract as any).target,
        fromBlock,
        toBlock: 'latest',
        topics: [
          ethers.id("DelegateChanged(address,address,address)"),
          null,
          null,
          ethers.zeroPadValue(delegateeAddress.toLowerCase(), 32) // Match on the delegatee parameter
        ]
      };
      
      // Query the logs
      const logs = await provider.getLogs(filter);
      logger.debug(`Found ${logs.length} on-chain delegation events to ${delegateeAddress}`);
      
      // Extract the delegator addresses from the logs
      for (const log of logs) {
        try {
          const parsedLog = (votingContract as any).interface.parseLog({
            topics: [...log.topics],
            data: log.data,
          });
          
          if (parsedLog && parsedLog.args) {
            // The first parameter is the delegator
            const delegator = parsedLog.args[0].toLowerCase();
            if (delegator) {
              // Only add if we don't already have it from Firebase
              if (!delegators.has(delegator)) {
                delegators.set(delegator, '0'); // We'll update the voting power later
              }
            }
          }
        } catch (error) {
          logger.warn('Error parsing event log:', error);
        }
      }
    } catch (onChainError) {
      logger.warn('Error fetching on-chain delegation events:', onChainError);
    }
    
    // No delegators found
    if (delegators.size === 0) {
      return [];
    }
    
    // Get token balances for each delegator (if we don't already have them)
    const delegatorsArray = Array.from(delegators.entries());
    const { tokenContract } = await getContracts();
    const tokenContractAny = tokenContract as any;
    
    const delegatorsWithPower = await Promise.all(
      delegatorsArray.map(async ([address, existingPower]) => {
        try {
          // If we already have the power from Firebase, use it
          if (existingPower && parseFloat(existingPower) > 0) {
            return {
              address,
              votingPower: existingPower
            };
          }
          
          // Otherwise fetch from blockchain
          const balance = await tokenContractAny.balanceOf(address);
          const tokenBalance = ethers.formatEther(balance);
          
          return {
            address,
            votingPower: tokenBalance
          };
        } catch (error) {
          logger.warn(`Error getting token balance for ${address}:`, error);
          return {
            address,
            votingPower: existingPower || '0'
          };
        }
      })
    );
    
    // Filter delegators with balance > 0 and sort by balance (descending)
    return delegatorsWithPower
      .filter(delegator => parseFloat(delegator.votingPower) > 0)
      .sort((a, b) => parseFloat(b.votingPower) - parseFloat(a.votingPower));
    
  } catch (error) {
    logger.error(`Error fetching delegations to ${delegateeAddress}:`, error);
    
    if (error instanceof ContractServiceError) {
      throw error;
    }
    
    const classifiedError = classifyError(error);
    
    // For this specific function, we return an empty array instead of throwing
    // to prevent UI disruption, but we still log the error
    logger.error('Returning empty array due to error:', classifiedError);
    return [];
  }
};

export async function delegate(delegateAddress: string) {
  try {
    const contract = await getContract();
    if (!contract) throw new Error('Contract not initialized');

    const tx = await contract.delegate(delegateAddress);
    await tx.wait();
    
    logger.debug('Successfully delegated to:', delegateAddress);
    return true;
  } catch (error) {
    logger.error('Error in delegate function:', error);
    throw error;
  }
}

export async function getDelegateAddress(address: string) {
  try {
    const contract = await getContract();
    if (!contract) throw new Error('Contract not initialized');

    const delegateAddress = await contract.delegates(address);
    return delegateAddress;
  } catch (error) {
    logger.error('Error getting delegate address:', error);
    throw error;
  }
}

export { ProposalState };

// Check for proposals with no votes after some time and notify creator
export const checkProposalsWithNoVotes = async (): Promise<void> => {
  try {
    logger.debug('Checking for proposals with no votes');
    
    const { votingContract } = await getContracts();
    const count = await votingContract.getProposalCount();
    
    // Import Firebase functions to avoid circular dependencies
    const { createNoVotesNotification, getProposalFromFirebase } = await import('./firebaseService');
    
    // Check all proposals
    for (let i = 1; i <= count; i++) {
      try {
        // Get the proposal state first to filter only active ones
        const state = await votingContract.state(i);
        
        // Only check active proposals
        if (state === ProposalState.Active) {
          const proposal = await getProposalFromFirebase(i);
          
          if (proposal) {
            const hasVotes = proposal.forVotes > 0 || proposal.againstVotes > 0 || proposal.abstainVotes > 0;
            
            // Calculate time since proposal started
            const now = Date.now();
            const startTime = proposal.startTime;
            const timeElapsed = now - startTime;
            
            // If proposal has been active for more than 24 hours with no votes
            const oneDay = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
            
            if (!hasVotes && timeElapsed > oneDay) {
              logger.debug(`Proposal ${i} has no votes after 24 hours`);
              
              // Create notification for the proposal creator
              await createNoVotesNotification(
                i,
                proposal.title,
                proposal.proposer
              );
            }
          }
        }
      } catch (proposalError) {
        logger.error(`Error checking proposal ${i}:`, proposalError);
        // Continue with next proposal
      }
    }
    
    logger.debug('Finished checking proposals with no votes');
  } catch (error) {
    logger.error('Error checking proposals with no votes:', error);
    throw classifyError(error);
  }
};

// Withdraw a proposal with no votes
export const withdrawProposalWithNoVotes = async (proposalId: number): Promise<boolean> => {
  try {
    logger.debug(`Withdrawing proposal ${proposalId} with no votes`);
    
    // First verify that the proposal has no votes
    const { votingContract, signer } = await getSignerContracts();
    const votingContractAny = votingContract as any;
    const userAddress = await signer.getAddress();
    
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
    ] = await votingContractAny.getProposal(proposalId);
    
    // Check if proposal has any votes
    const hasVotes = forVotes > 0 || againstVotes > 0 || abstainVotes > 0;
    
    if (hasVotes) {
      throw new ContractServiceError(
        'Cannot withdraw proposal with votes',
        ContractErrorType.CONTRACT_ERROR
      );
    }
    
    // Import Firebase function to get proposer
    const { getProposalFromFirebase } = await import('./firebaseService');
    const proposalData = await getProposalFromFirebase(proposalId);
    
    // Verify that the current user is the proposer
    if (proposalData && proposalData.proposer.toLowerCase() !== userAddress.toLowerCase()) {
      throw new ContractServiceError(
        'Only the proposer can withdraw their proposal',
        ContractErrorType.INSUFFICIENT_PERMISSIONS
      );
    }
    
    // Cancel the proposal
    await cancelProposal(proposalId);
    
    logger.debug(`Successfully withdrew proposal ${proposalId}`);
    return true;
  } catch (error) {
    logger.error(`Error withdrawing proposal ${proposalId}:`, error);
    
    if (error instanceof ContractServiceError) {
      throw error;
    }
    
    throw classifyError(error);
  }
};