// ABI for the Voting contract
export const VOTING_ABI = [
  "function getProposalCount() public view returns (uint256)",
  "function createProposal(string memory _title, string memory _description, uint256 _votingDuration) public returns (uint256)",
  "function castVote(uint256 _proposalId, uint8 _support) public",
  "function executeProposal(uint256 _proposalId) public",
  "function cancelProposal(uint256 _proposalId) public",
  "function getProposal(uint256 _proposalId) public view returns (string memory title, string memory description, uint256 forVotes, uint256 againstVotes, uint256 abstainVotes, uint256 startTime, uint256 endTime, uint8 currentState)",
  "function state(uint256 _proposalId) public view returns (uint8)",
  "function hasVoted(uint256 _proposalId, address _voter) public view returns (bool, uint8, uint256)",
  "function delegate(address _delegatee) public",
  "function undelegate() public",
  "function governanceToken() public view returns (address)",
  "event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string title, uint256 startTime, uint256 endTime)",
  "event VoteCast(address indexed voter, uint256 indexed proposalId, uint8 support, uint256 votes)",
  "event ProposalExecuted(uint256 indexed proposalId)",
  "event ProposalCanceled(uint256 indexed proposalId)"
];

// ABI for the GovernanceToken contract
export const GOVERNANCE_TOKEN_ABI = [
  "function name() public view returns (string)",
  "function symbol() public view returns (string)",
  "function decimals() public view returns (uint8)",
  "function totalSupply() public view returns (uint256)",
  "function balanceOf(address account) public view returns (uint256)",
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) public returns (bool)",
  "function mint(address to, uint256 amount) public returns (bool)",
  "function owner() public view returns (address)",
  "function hasRole(bytes32 role, address account) public view returns (bool)"
];

// Contract addresses (to be updated after deployment)
export const VOTING_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_VOTING_CONTRACT_ADDRESS || '';
export const GOVERNANCE_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_GOVERNANCE_TOKEN_ADDRESS || '';

// Proposal states enum (must match the contract)
export enum ProposalState {
  Pending,    // Created but not yet active
  Active,     // Open for voting
  Canceled,   // Canceled by creator
  Defeated,   // Failed to reach quorum or majority
  Succeeded,  // Passed but not yet executed
  Executed,   // Successfully executed
  Expired     // Execution window expired
}

// Interface for a proposal
export interface Proposal {
  id: number;
  title: string;
  description: string;
  proposer: string;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  startTime: Date;
  endTime: Date;
  state: ProposalState;
  hasVoted: boolean;
  userVote: VoteType;
  userVoteWeight: number;
  metadata?: any; // Add metadata field for Firebase data
}

// Vote types
export enum VoteType {
  Against = 0,
  For = 1,
  Abstain = 2
}

// Contract configuration file
// Update these values after deployment

export interface ContractConfig {
  votingContract: string;
  tokenContract: string;
  chainId: number;
}

export interface NetworkConfig {
  [key: string]: ContractConfig;
}

// Configuration for different networks (update after deployment)
export const contractConfig: NetworkConfig = {
  // Sepolia testnet
  "11155111": {
    votingContract: "0xDE789a8e092004e196ac4A88Cd39d5aB8852402c",
    tokenContract: "0x775F4A912a09291Ae31422b149E0c37760C7AB02",
    chainId: 11155111
  },
  // Goerli testnet
  "5": {
    votingContract: "YOUR_DEPLOYED_VOTING_CONTRACT_ADDRESS",
    tokenContract: "YOUR_DEPLOYED_TOKEN_CONTRACT_ADDRESS",
    chainId: 5,
  },
  // Ethereum mainnet
  "1": {
    votingContract: "YOUR_DEPLOYED_VOTING_CONTRACT_ADDRESS",
    tokenContract: "YOUR_DEPLOYED_TOKEN_CONTRACT_ADDRESS", 
    chainId: 1,
  },
  // Localhost for testing
  "31337": {
    votingContract: "0x5FbDB2315678afecb367f032d93F642f64180aa3", // Default Hardhat deployment address
    tokenContract: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512", // Default Hardhat deployment address
    chainId: 31337,
  }
};

// Additional data model for Firebase storage
export interface ProposalData {
  id: number;
  title: string;
  description: string;
  proposer: string;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  startTime: number;
  endTime: number;
  executed: boolean;
  canceled: boolean;
  metadata?: Record<string, any>;
  votes?: Array<{
    voter: string;
    support: number;
    weight: number;
    timestamp: number;
  }>;
} 