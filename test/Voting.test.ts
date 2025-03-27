import { expect } from "chai";
import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("Voting Contract", function () {
  let votingContract: any;
  let owner: HardhatEthersSigner, voter1: HardhatEthersSigner, voter2: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, voter1, voter2] = await ethers.getSigners();
    const VotingFactory = await ethers.getContractFactory("Voting");
    votingContract = await VotingFactory.deploy();
    await votingContract.waitForDeployment();
  });

  describe("Proposal Creation", function () {
    it("Should create a new proposal successfully", async function () {
      const tx = await votingContract.createProposal("Test Proposal", "This is a test proposal", 7);
      const receipt = await tx.wait();

      // Check event was emitted
      const events = receipt?.logs.filter((x: any) => {
        return x.fragment?.name === "ProposalCreated"
      });
      expect(events?.length).to.equal(1);

      // Get created proposal
      const proposalCount = await votingContract.getProposalCount();
      expect(proposalCount).to.equal(1);

      const proposal = await votingContract.getProposal(0);
      expect(proposal[0]).to.equal("Test Proposal");
      expect(proposal[1]).to.equal("This is a test proposal");
      expect(proposal[2]).to.equal(0); // Initial vote count
      expect(proposal[4]).to.equal(true); // Active status
    });

    it("Should not create a proposal with empty title", async function () {
      await expect(
        votingContract.createProposal("", "This is a test proposal", 7)
      ).to.be.revertedWith("Title cannot be empty");
    });
  });

  describe("Voting", function () {
    beforeEach(async function () {
      await votingContract.createProposal("Test Proposal", "This is a test proposal", 7);
    });

    it("Should allow a user to vote on a proposal", async function () {
      await votingContract.connect(voter1).vote(0);
      
      // Check vote count
      const proposal = await votingContract.getProposal(0);
      expect(proposal[2]).to.equal(1);

      // Check hasVoted mapping
      const hasVoted = await votingContract.hasVoted(0, voter1.address);
      expect(hasVoted).to.equal(true);
    });

    it("Should not allow a user to vote twice on the same proposal", async function () {
      await votingContract.connect(voter1).vote(0);
      
      await expect(
        votingContract.connect(voter1).vote(0)
      ).to.be.revertedWith("You have already voted on this proposal");
    });

    it("Should not allow voting on a non-existent proposal", async function () {
      await expect(
        votingContract.connect(voter1).vote(999)
      ).to.be.revertedWith("Invalid proposal ID");
    });
  });
}); 