// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./ZKVerifier.sol";

/**
 * @title Enhanced Voting Contract for DAO Governance
 * @dev Implements proposal lifecycle, weighted voting, delegation and automated execution
 */
contract Voting is Ownable {
    using Math for uint256;

    // Governance token for voting weight
    IERC20 public governanceToken;
    
    // ZK verifier for private voting
    ZKVerifier public zkVerifier;
    
    // Flag to enable/disable private voting
    bool public privateVotingEnabled = false;
    
    // Minimum token balance required to create a proposal
    uint256 public proposalThreshold;
    
    // Minimum duration for a proposal in seconds
    uint256 public minimumVotingPeriod = 1 days;
    
    // Minimum votes a proposal needs to be valid
    uint256 public quorumVotes;
    
    // Time delay before a proposal becomes active
    uint256 public votingDelay = 1 hours;
    
    // Grace period for execution after proposal passes
    uint256 public gracePeriod = 7 days;

    // Enum for proposal states
    enum ProposalState {
        Pending,    // Created but not yet active
        Active,     // Open for voting
        Canceled,   // Canceled by creator
        Defeated,   // Failed to reach quorum or majority
        Succeeded,  // Passed but not yet executed
        Executed,   // Successfully executed
        Expired     // Execution window expired
    }

    // Structure for a proposal
    struct Proposal {
        uint256 id;
        address proposer;
        string title;
        string description;
        uint256 startTime;      // When voting begins
        uint256 endTime;        // When voting ends
        uint256 creationTime;   // When proposal was created
        bool executed;          // Whether proposal has been executed
        bool canceled;          // Whether proposal has been canceled
        uint256 forVotes;       // Votes supporting proposal
        uint256 againstVotes;   // Votes against proposal
        uint256 abstainVotes;   // Votes abstaining
        mapping(address => Receipt) receipts; // Voting receipts
    }

    // Structure for a vote receipt with privacy
    struct Receipt {
        bool hasVoted;
        uint8 support; // 0=against, 1=for, 2=abstain
        uint256 votes;
        bool isPrivate; // Whether this was a private vote
    }

    // Public proposal count
    uint256 public proposalCount;
    
    // Mapping from proposal ID to Proposal
    mapping(uint256 => Proposal) public proposals;
    
    // Mapping from address to delegatee
    mapping(address => address) public delegates;
    
    // Cooldown period after voting to prevent flash loans
    uint256 public voteLockDuration = 3 days;
    
    // Mapping to track when a user last voted
    mapping(address => uint256) public lastVoteTime;

    // Events
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string title,
        uint256 startTime,
        uint256 endTime
    );
    
    event VoteCast(
        address indexed voter,
        uint256 indexed proposalId,
        uint8 support,
        uint256 votes
    );
    
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCanceled(uint256 indexed proposalId);
    event DelegateChanged(address indexed delegator, address indexed fromDelegate, address indexed toDelegate);
    event QuorumUpdated(uint256 oldQuorum, uint256 newQuorum);
    event ProposalThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event PrivateVoteCast(
        address indexed voter,
        uint256 indexed proposalId,
        bytes32 voteHash
    );
    event PrivateVotingToggled(bool enabled);

    /**
     * @dev Constructor to initialize the voting contract
     * @param _governanceToken The ERC20 token used for governance
     * @param _proposalThreshold Minimum tokens required to create a proposal
     * @param _quorumVotes Minimum votes required for a proposal to be valid
     */
    constructor(
        address _governanceToken,
        uint256 _proposalThreshold,
        uint256 _quorumVotes
    ) Ownable(msg.sender) {
        require(_governanceToken != address(0), "Invalid governance token");
        
        governanceToken = IERC20(_governanceToken);
        proposalThreshold = _proposalThreshold;
        quorumVotes = _quorumVotes;
        
        // Create and set the ZK verifier
        zkVerifier = new ZKVerifier();
    }

    /**
     * @dev Create a new proposal
     * @param _title Title of the proposal
     * @param _description Description of the proposal
     * @param _votingDuration Duration of voting period in days
     */
    function createProposal(
        string memory _title,
        string memory _description,
        uint256 _votingDuration
    ) public returns (uint256) {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_description).length > 0, "Description cannot be empty");
        require(_votingDuration >= 1, "Voting period must be at least 1 day");
        
        // Check if caller has enough tokens to create a proposal
        uint256 userBalance = governanceToken.balanceOf(msg.sender);
        require(userBalance >= proposalThreshold, "Not enough tokens to create proposal");
        
        // Calculate voting window
        uint256 startTime = block.timestamp + votingDelay;
        uint256 endTime = startTime + (_votingDuration * 1 days);
        
        // Ensure minimum voting period
        require(endTime - startTime >= minimumVotingPeriod, "Voting period too short");
        
        proposalCount++;
        uint256 proposalId = proposalCount;
        
        Proposal storage newProposal = proposals[proposalId];
        newProposal.id = proposalId;
        newProposal.proposer = msg.sender;
        newProposal.title = _title;
        newProposal.description = _description;
        newProposal.startTime = startTime;
        newProposal.endTime = endTime;
        newProposal.creationTime = block.timestamp;
        newProposal.executed = false;
        newProposal.canceled = false;
        
        emit ProposalCreated(proposalId, msg.sender, _title, startTime, endTime);
        
        return proposalId;
    }

    /**
     * @dev Cast a vote on a proposal
     * @param _proposalId ID of the proposal
     * @param _support 0=against, 1=for, 2=abstain
     */
    function castVote(uint256 _proposalId, uint8 _support) public {
        require(_proposalId <= proposalCount, "Invalid proposal ID");
        require(_support <= 2, "Invalid vote type");
        
        Proposal storage proposal = proposals[_proposalId];
        Receipt storage receipt = proposal.receipts[msg.sender];
        
        require(state(_proposalId) == ProposalState.Active, "Proposal not active");
        require(!receipt.hasVoted, "Already voted");
        
        // Calculate vote weight based on governance token balance
        // First check if the voter has delegated their votes
        address actualVoter = delegates[msg.sender] == address(0) ? msg.sender : delegates[msg.sender];
        uint256 votes = governanceToken.balanceOf(actualVoter);
        
        // Record vote
        receipt.hasVoted = true;
        receipt.support = _support;
        receipt.votes = votes;
        
        // Update vote counts
        if (_support == 0) {
            proposal.againstVotes += votes;
        } else if (_support == 1) {
            proposal.forVotes += votes;
        } else if (_support == 2) {
            proposal.abstainVotes += votes;
        }
        
        // Record last vote time to prevent quick selling after voting
        lastVoteTime[msg.sender] = block.timestamp;
        
        emit VoteCast(msg.sender, _proposalId, _support, votes);
    }

    /**
     * @dev Execute a successful proposal
     * @param _proposalId ID of the proposal to execute
     */
    function executeProposal(uint256 _proposalId) external {
        require(_proposalId <= proposalCount, "Invalid proposal ID");
        
        Proposal storage proposal = proposals[_proposalId];
        
        require(state(_proposalId) == ProposalState.Succeeded, "Proposal not successful");
        require(!proposal.executed, "Proposal already executed");
        
        proposal.executed = true;
        
        emit ProposalExecuted(_proposalId);
    }

    /**
     * @dev Execute a proposal with additional transaction data
     * @param _proposalId ID of the proposal to execute
     * @param _transactionData The encoded transaction data to execute
     */
    function executeProposalWithData(uint256 _proposalId, bytes memory _transactionData) external {
        require(_proposalId <= proposalCount, "Invalid proposal ID");
        
        Proposal storage proposal = proposals[_proposalId];
        
        require(state(_proposalId) == ProposalState.Succeeded, "Proposal not successful");
        require(!proposal.executed, "Proposal already executed");
        
        proposal.executed = true;
        
        // Execute the transaction with the provided data
        (bool success, ) = address(this).call(_transactionData);
        require(success, "Transaction execution failed");
        
        emit ProposalExecuted(_proposalId);
    }

    /**
     * @dev Cancel a proposal
     * @param _proposalId ID of the proposal to cancel
     */
    function cancelProposal(uint256 _proposalId) public {
        require(_proposalId <= proposalCount, "Invalid proposal ID");
        
        Proposal storage proposal = proposals[_proposalId];
        
        // Only allow cancellation if not yet executed/expired/defeated
        ProposalState currentState = state(_proposalId);
        require(
            currentState != ProposalState.Executed &&
            currentState != ProposalState.Expired &&
            currentState != ProposalState.Canceled,
            "Proposal can't be canceled"
        );
        
        // Only proposer or governance (owner) can cancel
        require(
            msg.sender == proposal.proposer || msg.sender == owner(),
            "Not authorized to cancel"
        );
        
        proposal.canceled = true;
        
        emit ProposalCanceled(_proposalId);
    }

    /**
     * @dev Get the current state of a proposal
     * @param _proposalId ID of the proposal
     * @return ProposalState indicating the current state
     */
    function state(uint256 _proposalId) public view returns (ProposalState) {
        require(_proposalId <= proposalCount, "Invalid proposal ID");
        
        Proposal storage proposal = proposals[_proposalId];
        
        if (proposal.canceled) {
            return ProposalState.Canceled;
        }
        
        if (proposal.executed) {
            return ProposalState.Executed;
        }
        
        if (block.timestamp < proposal.startTime) {
            return ProposalState.Pending;
        }
        
        if (block.timestamp <= proposal.endTime) {
            return ProposalState.Active;
        }
        
        // Check if proposal has reached quorum and majority
        if (proposal.forVotes > proposal.againstVotes && proposal.forVotes + proposal.abstainVotes >= quorumVotes) {
            // Check if in grace period
            if (block.timestamp <= proposal.endTime + gracePeriod) {
                return ProposalState.Succeeded;
            } else {
                return ProposalState.Expired;
            }
        } else {
            return ProposalState.Defeated;
        }
    }

    /**
     * @dev Get proposal details
     * @param _proposalId ID of the proposal
     * @return title The proposal title
     * @return description The proposal description
     * @return forVotes Number of votes in favor
     * @return againstVotes Number of votes against
     * @return abstainVotes Number of abstained votes
     * @return startTime The proposal start time
     * @return endTime The proposal end time
     * @return currentState The current state of the proposal
     */
    function getProposal(uint256 _proposalId) public view returns (
        string memory title,
        string memory description,
        uint256 forVotes,
        uint256 againstVotes,
        uint256 abstainVotes,
        uint256 startTime,
        uint256 endTime,
        ProposalState currentState
    ) {
        require(_proposalId <= proposalCount, "Invalid proposal ID");
        
        Proposal storage proposal = proposals[_proposalId];
        
        return (
            proposal.title,
            proposal.description,
            proposal.forVotes,
            proposal.againstVotes,
            proposal.abstainVotes,
            proposal.startTime,
            proposal.endTime,
            state(_proposalId)
        );
    }

    /**
     * @dev Get the total number of proposals
     * @return Count of proposals
     */
    function getProposalCount() public view returns (uint256) {
        return proposalCount;
    }

    /**
     * @dev Check if a user has voted on a proposal
     * @param _proposalId ID of the proposal
     * @param _voter Address of the voter
     * @return Whether the voter has voted, their vote choice, and voting power
     */
    function hasVoted(uint256 _proposalId, address _voter) public view returns (bool, uint8, uint256) {
        require(_proposalId <= proposalCount, "Invalid proposal ID");
        
        Receipt storage receipt = proposals[_proposalId].receipts[_voter];
        
        return (receipt.hasVoted, receipt.support, receipt.votes);
    }

    /**
     * @dev Delegate votes to another address
     * @param _delegatee Address to delegate votes to
     */
    function delegate(address _delegatee) public {
        require(_delegatee != address(0), "Cannot delegate to zero address");
        require(_delegatee != msg.sender, "Cannot delegate to self");
        
        address oldDelegate = delegates[msg.sender];
        delegates[msg.sender] = _delegatee;
        
        emit DelegateChanged(msg.sender, oldDelegate, _delegatee);
    }

    /**
     * @dev Remove delegation
     */
    function undelegate() public {
        address oldDelegate = delegates[msg.sender];
        require(oldDelegate != address(0), "Not currently delegating");
        
        delegates[msg.sender] = address(0);
        
        emit DelegateChanged(msg.sender, oldDelegate, address(0));
    }

    /**
     * @dev Update the quorum threshold
     * @param _newQuorum New quorum value
     */
    function setQuorumVotes(uint256 _newQuorum) public onlyOwner {
        uint256 oldQuorum = quorumVotes;
        quorumVotes = _newQuorum;
        
        emit QuorumUpdated(oldQuorum, _newQuorum);
    }

    /**
     * @dev Update the proposal threshold
     * @param _newThreshold New threshold value
     */
    function setProposalThreshold(uint256 _newThreshold) public onlyOwner {
        uint256 oldThreshold = proposalThreshold;
        proposalThreshold = _newThreshold;
        
        emit ProposalThresholdUpdated(oldThreshold, _newThreshold);
    }

    /**
     * @dev Update the voting delay
     * @param _newVotingDelay New voting delay in seconds
     */
    function setVotingDelay(uint256 _newVotingDelay) public onlyOwner {
        votingDelay = _newVotingDelay;
    }

    /**
     * @dev Update the minimum voting period
     * @param _newMinimumVotingPeriod New voting period in seconds
     */
    function setMinimumVotingPeriod(uint256 _newMinimumVotingPeriod) public onlyOwner {
        minimumVotingPeriod = _newMinimumVotingPeriod;
    }

    /**
     * @dev Update the grace period for execution
     * @param _newGracePeriod New grace period in seconds
     */
    function setGracePeriod(uint256 _newGracePeriod) public onlyOwner {
        gracePeriod = _newGracePeriod;
    }

    /**
     * @dev Toggle private voting mode
     * @param _enabled Whether private voting should be enabled
     */
    function togglePrivateVoting(bool _enabled) external onlyOwner {
        privateVotingEnabled = _enabled;
        emit PrivateVotingToggled(_enabled);
    }
    
    /**
     * @dev Set a custom ZK verifier contract
     * @param _verifier Address of the ZK verifier contract
     */
    function setZKVerifier(address _verifier) external onlyOwner {
        require(_verifier != address(0), "Verifier cannot be zero address");
        zkVerifier = ZKVerifier(_verifier);
    }
    
    /**
     * @dev Cast a private vote using ZK-SNARKs
     * @param _proposalId Proposal ID
     * @param _voteHash Hash of the vote (commitment)
     * @param _proof ZK proof components
     * @param _inputs Public inputs for the proof verification
     */
    function castPrivateVote(
        uint256 _proposalId,
        bytes32 _voteHash,
        ZKVerifier.Proof memory _proof,
        uint256[] memory _inputs
    ) public {
        require(privateVotingEnabled, "Private voting is not enabled");
        require(_proposalId <= proposalCount, "Invalid proposal ID");
        
        Proposal storage proposal = proposals[_proposalId];
        Receipt storage receipt = proposal.receipts[msg.sender];
        
        require(state(_proposalId) == ProposalState.Active, "Proposal not active");
        require(!receipt.hasVoted, "Already voted");
        
        // Verify the zero-knowledge proof
        bool isValidProof = zkVerifier.verifyProof(_proposalId, _proof, _inputs);
        require(isValidProof, "Invalid zero-knowledge proof");
        
        // Mark that the user has voted without revealing their choice
        receipt.hasVoted = true;
        receipt.isPrivate = true;
        
        // The actual vote values are not stored on-chain
        // Vote tallying will happen off-chain based on the commitments
        
        // Record last vote time to prevent quick selling after voting
        lastVoteTime[msg.sender] = block.timestamp;
        
        emit PrivateVoteCast(msg.sender, _proposalId, _voteHash);
    }
} 