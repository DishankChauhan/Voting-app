// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "hardhat/console.sol";

contract Voting {
    // Structure for a proposal
    struct Proposal {
        string title;
        string description;
        uint256 voteCount;
        uint256 deadline;
        bool active;
    }

    // Array to store all proposals
    Proposal[] public proposals;
    
    // Mapping to track if an address has voted on a specific proposal
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    
    // Events
    event ProposalCreated(uint256 proposalId, string title, uint256 deadline);
    event Voted(address voter, uint256 proposalId);
    
    // Function to create a new proposal
    function createProposal(string memory _title, string memory _description, uint256 _durationInDays) public returns (uint256) {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_description).length > 0, "Description cannot be empty");
        require(_durationInDays > 0, "Duration must be positive");
        
        uint256 deadline = block.timestamp + (_durationInDays * 1 days);
        
        Proposal memory newProposal = Proposal({
            title: _title,
            description: _description,
            voteCount: 0,
            deadline: deadline,
            active: true
        });
        
        proposals.push(newProposal);
        uint256 proposalId = proposals.length - 1;
        
        emit ProposalCreated(proposalId, _title, deadline);
        
        return proposalId;
    }
    
    // Function to vote on a proposal
    function vote(uint256 _proposalId) public {
        require(_proposalId < proposals.length, "Invalid proposal ID");
        require(proposals[_proposalId].active, "Proposal is not active");
        require(block.timestamp < proposals[_proposalId].deadline, "Voting period has ended");
        require(!hasVoted[_proposalId][msg.sender], "You have already voted on this proposal");
        
        proposals[_proposalId].voteCount++;
        hasVoted[_proposalId][msg.sender] = true;
        
        emit Voted(msg.sender, _proposalId);
    }
    
    // Function to get a proposal by ID
    function getProposal(uint256 _proposalId) public view returns (string memory, string memory, uint256, uint256, bool) {
        require(_proposalId < proposals.length, "Invalid proposal ID");
        
        Proposal memory proposal = proposals[_proposalId];
        return (proposal.title, proposal.description, proposal.voteCount, proposal.deadline, proposal.active);
    }
    
    // Function to get the total number of proposals
    function getProposalCount() public view returns (uint256) {
        return proposals.length;
    }
    
    // Function to close a proposal if the deadline has passed
    function closeExpiredProposal(uint256 _proposalId) public {
        require(_proposalId < proposals.length, "Invalid proposal ID");
        require(proposals[_proposalId].active, "Proposal is already inactive");
        require(block.timestamp >= proposals[_proposalId].deadline, "Voting period has not ended yet");
        
        proposals[_proposalId].active = false;
    }
} 