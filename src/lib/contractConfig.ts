// ABI for the Voting contract
export const VOTING_ABI = [
  "function getProposalCount() public view returns (uint256)",
  "function createProposal(string memory _title, string memory _description, uint256 _durationInDays) public returns (uint256)",
  "function vote(uint256 _proposalId) public",
  "function getProposal(uint256 _proposalId) public view returns (string memory, string memory, uint256, uint256, bool)",
  "function hasVoted(uint256, address) public view returns (bool)",
  "function closeExpiredProposal(uint256 _proposalId) public",
  "event ProposalCreated(uint256 proposalId, string title, uint256 deadline)",
  "event Voted(address voter, uint256 proposalId)"
];

// Contract address (to be updated after deployment)
export const VOTING_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '';

// Interface for a proposal
export interface Proposal {
  id: number;
  title: string;
  description: string;
  voteCount: number;
  deadline: Date;
  active: boolean;
  hasVoted: boolean;
} 