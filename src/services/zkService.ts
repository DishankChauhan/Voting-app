import { ethers } from 'ethers';
import logger from '@/utils/logger';
import { getSignerContracts } from './contractService';
import { updateProposalVotes, getProposalFromFirebase } from './firebaseService';

// Types for ZK components
export interface ZKProof {
  A: [string, string];
  B: [string, string];
  C: [string, string];
}

export interface PrivateVote {
  proposalId: number;
  support: number; // 0=against, 1=for, 2=abstain
  weight: number;
  commitment: string;
  nullifier: string;
  proof: ZKProof;
}

export enum PrivacyLevel {
  PUBLIC = 'public',
  PRIVATE = 'private',
  HYBRID = 'hybrid'
}

// Error types
export enum ZKErrorType {
  PROOF_GENERATION_ERROR = 'proof_generation_error',
  VERIFICATION_ERROR = 'verification_error',
  NO_PROVIDER = 'no_provider',
  INVALID_PARAMETERS = 'invalid_parameters',
  NOT_ENABLED = 'not_enabled'
}

// Custom error class
export class ZKServiceError extends Error {
  type: ZKErrorType;

  constructor(message: string, type: ZKErrorType) {
    super(message);
    this.name = 'ZKServiceError';
    this.type = type;
  }
}

/**
 * Check if private voting is enabled
 */
export const isPrivateVotingEnabled = async (): Promise<boolean> => {
  try {
    const { votingContract } = await getSignerContracts();
    const votingContractAny = votingContract as any;
    
    return await votingContractAny.privateVotingEnabled();
  } catch (error) {
    logger.warn('Error checking if private voting is enabled:', error);
    return false;
  }
};

/**
 * Generate a commitment for a private vote
 * In a real implementation, this would use a proper cryptographic commitment scheme
 * @param proposalId The proposal ID
 * @param support The vote support type (0=against, 1=for, 2=abstain)
 * @param voterAddress The voter's address
 * @param secret A random secret for the commitment
 */
export const generateVoteCommitment = (
  proposalId: number,
  support: number,
  voterAddress: string,
  secret: string
): string => {
  const commitmentData = ethers.solidityPackedKeccak256(
    ['uint256', 'uint8', 'address', 'bytes32'],
    [proposalId, support, voterAddress, ethers.keccak256(ethers.toUtf8Bytes(secret))]
  );
  
  return commitmentData;
};

/**
 * Mock function to simulate generating a zero-knowledge proof
 * In a real implementation, this would use a proper ZK library like snarkjs
 * @param proposalId The proposal ID
 * @param support The vote support type (0=against, 1=for, 2=abstain)
 * @param weight The vote weight
 * @param secret The secret used for the commitment
 */
export const generateZKProof = async (
  proposalId: number,
  support: number,
  weight: number,
  secret: string
): Promise<ZKProof> => {
  try {
    logger.debug(`Generating ZK proof for proposal ${proposalId}`);
    
    // In a real implementation, this would call a ZK prover library
    // For this demo, we'll generate mock proof data
    
    // Simulate proof generation delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Generate deterministic but unique-looking proof components
    const baseHash = ethers.keccak256(
      ethers.solidityPacked(
        ['uint256', 'uint8', 'uint256', 'string'],
        [proposalId, support, weight, secret]
      )
    );
    
    // Mock ZK proof (in a real implementation, these would be proper elliptic curve points)
    const proof: ZKProof = {
      A: [
        '0x' + baseHash.slice(2, 34),
        '0x' + baseHash.slice(34, 66)
      ],
      B: [
        '0x' + ethers.keccak256(ethers.toUtf8Bytes('B1' + baseHash)).slice(2, 34),
        '0x' + ethers.keccak256(ethers.toUtf8Bytes('B2' + baseHash)).slice(2, 34)
      ],
      C: [
        '0x' + ethers.keccak256(ethers.toUtf8Bytes('C1' + baseHash)).slice(2, 34),
        '0x' + ethers.keccak256(ethers.toUtf8Bytes('C2' + baseHash)).slice(2, 34)
      ]
    };
    
    logger.debug('ZK proof generated successfully');
    return proof;
  } catch (error) {
    logger.error('Error generating ZK proof:', error);
    throw new ZKServiceError(
      'Failed to generate zero-knowledge proof',
      ZKErrorType.PROOF_GENERATION_ERROR
    );
  }
};

/**
 * Cast a private vote using ZK-SNARKs
 * @param proposalId The proposal ID to vote on
 * @param support The vote type (0=against, 1=for, 2=abstain)
 * @param secret A secret string for commitment
 */
export const castPrivateVote = async (
  proposalId: number,
  support: number,
  secret: string
): Promise<boolean> => {
  try {
    logger.debug(`Casting private vote on proposal ${proposalId}`);
    
    // Check if private voting is enabled
    const isEnabled = await isPrivateVotingEnabled();
    if (!isEnabled) {
      throw new ZKServiceError(
        'Private voting is not enabled',
        ZKErrorType.NOT_ENABLED
      );
    }
    
    const { votingContract, tokenContract, signer } = await getSignerContracts();
    const tokenContractAny = tokenContract as any;
    const votingContractAny = votingContract as any;
    const voterAddress = await signer.getAddress();
    
    // Get user's token balance for vote weight
    const balance = await tokenContractAny.balanceOf(voterAddress);
    
    if (balance.isZero()) {
      throw new ZKServiceError(
        'You need governance tokens to vote',
        ZKErrorType.INVALID_PARAMETERS
      );
    }
    
    // Calculate vote weight (quadratic voting approach)
    const tokenBalance = parseFloat(ethers.formatUnits(balance, 18));
    const voteWeight = Math.floor(Math.sqrt(tokenBalance) * 100) / 100;
    
    // Generate commitment
    const commitment = generateVoteCommitment(proposalId, support, voterAddress, secret);
    
    // Generate nullifier (prevents double voting)
    const nullifier = ethers.keccak256(
      ethers.solidityPacked(
        ['address', 'uint256', 'string'],
        [voterAddress, proposalId, secret]
      )
    );
    
    // Generate ZK proof
    const zkProof = await generateZKProof(proposalId, support, voteWeight, secret);
    
    // Prepare proof for contract call
    const contractProof = {
      A: [
        ethers.toBigInt(zkProof.A[0]),
        ethers.toBigInt(zkProof.A[1])
      ],
      B: [
        ethers.toBigInt(zkProof.B[0]),
        ethers.toBigInt(zkProof.B[1])
      ],
      C: [
        ethers.toBigInt(zkProof.C[0]),
        ethers.toBigInt(zkProof.C[1])
      ]
    };
    
    // Public inputs (would vary based on the specific ZK circuit)
    const publicInputs = [
      ethers.toBigInt(proposalId),
      ethers.toBigInt(ethers.dataSlice(nullifier, 0, 8)) // Use part of nullifier as public input
    ];
    
    // Submit the private vote on-chain
    const tx = await votingContractAny.castPrivateVote(
      proposalId,
      commitment,
      contractProof,
      publicInputs
    );
    
    await tx.wait();
    
    // Store the private vote data in Firebase for off-chain tallying
    // This is a compromise - in a real privacy solution, this would be more sophisticated
    const proposal = await getProposalFromFirebase(proposalId);
    
    if (proposal) {
      const privateVoteData = {
        voter: voterAddress,
        support,
        weight: voteWeight,
        timestamp: Date.now(),
        commitment,
        nullifier,
        isPrivate: true
      };
      
      // Store private vote data
      const proposalWithVotes = proposal as any;
      proposalWithVotes.privateVotes = proposalWithVotes.privateVotes || [];
      proposalWithVotes.privateVotes.push(privateVoteData);
      
      // Update vote counts
      if (support === 0) {
        proposalWithVotes.againstVotes += voteWeight;
      } else if (support === 1) {
        proposalWithVotes.forVotes += voteWeight;
      } else if (support === 2) {
        proposalWithVotes.abstainVotes += voteWeight;
      }
      
      await updateProposalVotes(proposalWithVotes);
    }
    
    logger.debug(`Successfully cast private vote on proposal ${proposalId}`);
    return true;
  } catch (error) {
    logger.error(`Error casting private vote on proposal ${proposalId}:`, error);
    
    if (error instanceof ZKServiceError) {
      throw error;
    }
    
    throw new ZKServiceError(
      'Failed to cast private vote',
      ZKErrorType.VERIFICATION_ERROR
    );
  }
};

/**
 * Toggle private voting mode
 * @param enabled Whether to enable private voting
 */
export const togglePrivateVoting = async (enabled: boolean): Promise<boolean> => {
  try {
    logger.debug(`${enabled ? 'Enabling' : 'Disabling'} private voting`);
    
    const { votingContract } = await getSignerContracts();
    const votingContractAny = votingContract as any;
    
    const tx = await votingContractAny.togglePrivateVoting(enabled);
    await tx.wait();
    
    logger.debug(`Private voting ${enabled ? 'enabled' : 'disabled'} successfully`);
    return true;
  } catch (error) {
    logger.error('Error toggling private voting:', error);
    throw new ZKServiceError(
      `Failed to ${enabled ? 'enable' : 'disable'} private voting`,
      ZKErrorType.VERIFICATION_ERROR
    );
  }
}; 