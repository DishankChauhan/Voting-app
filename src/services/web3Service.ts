import { ethers } from 'ethers';
import { GOVERNANCE_TOKEN_ABI, GOVERNANCE_TOKEN_ADDRESS } from '@/lib/contractConfig';
import { logger } from '@/utils/logger';

export async function getContract() {
  try {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('No ethereum provider found');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(GOVERNANCE_TOKEN_ADDRESS, GOVERNANCE_TOKEN_ABI, signer);

    return contract;
  } catch (error) {
    logger.error('Error getting contract:', error);
    return null;
  }
} 