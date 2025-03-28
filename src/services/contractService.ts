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

// Get all proposals
export const getProposals = async (): Promise<Proposal[]> => {
  try {
    if (!VOTING_CONTRACT_ADDRESS) {
      throw new ContractServiceError(
        'Voting contract address is not configured. Please deploy the contract first',
        ContractErrorType.CONTRACT_ERROR
      );
    }
    
    const contract = await getContracts().then(contracts => contracts.votingContract);
    
    // Try to get user address, but don't fail if not available
    let userAddress: string;
    try {
      userAddress = (await (await getSigner()).getAddress()).toLowerCase();
    } catch (error) {
      // If user isn't connected, we'll still show proposals but without user vote info
      logger.warn('Unable to get user address for proposal query:', error);
      userAddress = ethers.ZeroAddress;
    }
    
    // Get total number of proposals
    const count = await contract.getProposalCount();
    const proposals: Proposal[] = [];
    
    // Fetch each proposal
    for (let i = 1; i <= count; i++) {
      try {
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
        
        // Get user's vote on this proposal, only if we have a valid user address
        let hasVoted = false;
        let userVote = 0;
        let userVoteWeight = 0;
        
        if (userAddress !== ethers.ZeroAddress) {
          try {
            const [voted, vote, weight] = await contract.hasVoted(i, userAddress);
            hasVoted = voted;
            userVote = Number(vote);
            userVoteWeight = Number(ethers.formatEther(weight));
          } catch (voteError) {
            logger.warn(`Error fetching user vote for proposal ${i}:`, voteError);
            // Continue without user vote data
          }
        }
        
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
          userVoteWeight: Number(userVoteWeight)
        });
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

// Vote on a proposal
export const castVote = async (proposalId: number, support: VoteType): Promise<void> => {
  try {
    if (isNaN(proposalId) || proposalId <= 0) {
      throw new ContractServiceError(
        'Invalid proposal ID. Must be a positive number',
        ContractErrorType.INVALID_ADDRESS
      );
    }
    
    if (![VoteType.For, VoteType.Against, VoteType.Abstain].includes(support)) {
      throw new ContractServiceError(
        'Invalid vote type. Must be 0 (Against), 1 (For), or 2 (Abstain)',
        ContractErrorType.INVALID_ADDRESS
      );
    }
    
    const contract = await getSignerContracts().then(contracts => contracts.votingContract);
    
    // Check if the proposal exists and is active
    try {
      const proposals = await getProposals();
      const proposal = proposals.find(p => p.id === proposalId);
      
      if (!proposal) {
        throw new ContractServiceError(
          `Proposal with ID ${proposalId} does not exist`,
          ContractErrorType.INVALID_ADDRESS
        );
      }
      
      if (proposal.state !== ProposalState.Active) {
        throw new ContractServiceError(
          `Cannot vote on proposal: ${getProposalStateText(proposal.state)}`,
          ContractErrorType.CONTRACT_ERROR
        );
      }
      
      if (proposal.hasVoted) {
        throw new ContractServiceError(
          'You have already voted on this proposal',
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
    
    // Cast the vote
    const tx = await (contract as any).castVote(proposalId, support);
    await tx.wait();
  } catch (error) {
    logger.error(`Error voting on proposal ${proposalId}:`, error);
    
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

// Execute a proposal
export const executeProposal = async (proposalId: number): Promise<void> => {
  try {
    if (isNaN(proposalId) || proposalId <= 0) {
      throw new ContractServiceError(
        'Invalid proposal ID. Must be a positive number',
        ContractErrorType.INVALID_ADDRESS
      );
    }
    
    const contract = await getSignerContracts().then(contracts => contracts.votingContract);
    
    // Check if the proposal exists and can be executed
    try {
      const proposals = await getProposals();
      const proposal = proposals.find(p => p.id === proposalId);
      
      if (!proposal) {
        throw new ContractServiceError(
          `Proposal with ID ${proposalId} does not exist`,
          ContractErrorType.INVALID_ADDRESS
        );
      }
      
      if (proposal.state !== ProposalState.Succeeded) {
        throw new ContractServiceError(
          `Cannot execute proposal: ${getProposalStateText(proposal.state)}. Only Succeeded proposals can be executed`,
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
    
    // Execute the proposal
    const tx = await (contract as any).executeProposal(proposalId);
    await tx.wait();
  } catch (error) {
    logger.error(`Error executing proposal ${proposalId}:`, error);
    
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

// Delegate votes to another address
export const delegateVotes = async (delegateeAddress: string): Promise<void> => {
  try {
    if (!ethers.isAddress(delegateeAddress)) {
      throw new ContractServiceError(
        'Invalid delegate address format',
        ContractErrorType.INVALID_ADDRESS
      );
    }
    
    // Get user address to check if trying to self-delegate
    const signer = await getSigner();
    const userAddress = await signer.getAddress();
    
    if (delegateeAddress.toLowerCase() === userAddress.toLowerCase()) {
      throw new ContractServiceError(
        'You cannot delegate votes to yourself',
        ContractErrorType.INVALID_ADDRESS
      );
    }
    
    // Check if user has any tokens to delegate
    try {
      const balance = await getTokenBalance(userAddress);
      if (parseFloat(balance) <= 0) {
        throw new ContractServiceError(
          'You do not have any tokens to delegate. Please acquire some tokens first',
          ContractErrorType.INSUFFICIENT_FUNDS
        );
      }
    } catch (balanceError) {
      if (balanceError instanceof ContractServiceError) {
        throw balanceError;
      }
      logger.warn('Error checking token balance:', balanceError);
      // Continue anyway, the contract will revert if no balance
    }
    
    const contract = await getSignerContracts().then(contracts => contracts.votingContract);
    const tx = await (contract as any).delegate(delegateeAddress);
    await tx.wait();
  } catch (error) {
    logger.error(`Error delegating votes to ${delegateeAddress}:`, error);
    
    if (error instanceof ContractServiceError) {
      throw error;
    }
    
    throw classifyError(error);
  }
};

// Remove vote delegation
export const undelegate = async (): Promise<void> => {
  try {
    const contract = await getSignerContracts().then(contracts => contracts.votingContract);
    
    // Check if the user has delegated votes
    try {
      const signer = await getSigner();
      const userAddress = await signer.getAddress();
      const { hasDelegated } = await getDelegationStatus(userAddress);
      
      if (!hasDelegated) {
        throw new ContractServiceError(
          'You have not delegated your votes to anyone',
          ContractErrorType.CONTRACT_ERROR
        );
      }
    } catch (checkError) {
      if (checkError instanceof ContractServiceError) {
        throw checkError;
      }
      logger.warn('Error checking delegation status:', checkError);
      // Continue anyway, the contract will handle validation
    }
    
    const tx = await (contract as any).undelegate();
    await tx.wait();
  } catch (error) {
    logger.error('Error removing delegation:', error);
    
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

// Get user's current delegation status
export const getDelegationStatus = async (address: string): Promise<{ hasDelegated: boolean, delegatee: string | null }> => {
  try {
    if (!ethers.isAddress(address)) {
      throw new ContractServiceError(
        'Invalid address format',
        ContractErrorType.INVALID_ADDRESS
      );
    }
    
    const contract = await getSignerContracts().then(contracts => contracts.votingContract);
    const delegatee = await (contract as any).delegates(address);
    
    // Check if delegatee is not the zero address
    const hasDelegated = delegatee !== ethers.ZeroAddress;
    
    return {
      hasDelegated,
      delegatee: hasDelegated ? delegatee : null
    };
  } catch (error) {
    logger.error('Error getting delegation status:', error);
    
    if (error instanceof ContractServiceError) {
      throw error;
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
    
    const contract = await getSignerContracts().then(contracts => contracts.votingContract);
    const votingPower = await (contract as any).getVotes(address);
    return ethers.formatEther(votingPower);
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
    const { votingContract, provider } = await getContracts();
    
    // Create a set to store delegator addresses
    const delegators = new Set<string>();
    
    try {
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
      logger.debug(`Found ${logs.length} delegation events to ${delegateeAddress}`);
      
      // Extract the delegator addresses from the logs
      for (const log of logs) {
        try {
          const parsedLog = (votingContract as any).interface.parseLog({
            topics: [...log.topics],
            data: log.data,
          });
          
          if (parsedLog && parsedLog.args) {
            // The first parameter is the delegator
            const delegator = parsedLog.args[0];
            if (delegator) {
              delegators.add(delegator);
            }
          }
        } catch (error) {
          logger.warn('Error parsing event log:', error);
        }
      }
      
      logger.debug(`Extracted ${delegators.size} unique delegator addresses`);
    } catch (error) {
      logger.warn('Error fetching delegation events:', error);
      
      if (error instanceof ContractServiceError) {
        throw error;
      }
      
      // Continue with empty set if events couldn't be fetched
    }
    
    // No delegators found
    if (delegators.size === 0) {
      return [];
    }
    
    // Get token balances for each delegator
    const delegatorsArray = Array.from(delegators);
    const { tokenContract } = await getContracts();
    
    const delegatorsWithPower = await Promise.all(
      delegatorsArray.map(async (address) => {
        try {
          const balance = await tokenContract.balanceOf(address);
          const tokenBalance = ethers.formatEther(balance);
          
          return {
            address,
            votingPower: tokenBalance
          };
        } catch (error) {
          logger.warn(`Error getting token balance for ${address}:`, error);
          return {
            address,
            votingPower: '0'
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
