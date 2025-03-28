import { ethers } from 'ethers';

export interface ValidationResult {
  isValid: boolean;
  errorMessage: string; // Always defined when isValid is false
}

export interface AddressValidationOptions {
  allowEmpty?: boolean;
  allowZeroAddress?: boolean;
  userAddress?: string; // To check if address is the same as the user's
  allowSelfDelegation?: boolean;
}

export interface TokenAmountValidationOptions {
  min?: string | number;
  max?: string | number;
  allowZero?: boolean;
  decimals?: number;
  userBalance?: string | number;
}

/**
 * Validates Ethereum addresses with customizable options
 */
export function validateEthereumAddress(
  address: string,
  options: AddressValidationOptions = {}
): ValidationResult {
  const {
    allowEmpty = false,
    allowZeroAddress = false,
    userAddress,
    allowSelfDelegation = true,
  } = options;

  // Check for empty address
  if (!address || address.trim() === "") {
    return {
      isValid: allowEmpty,
      errorMessage: "Address is required"
    };
  }

  // Check for valid address format
  if (!ethers.isAddress(address)) {
    return {
      isValid: false,
      errorMessage: "Please enter a valid Ethereum address"
    };
  }

  // Check for zero address
  if (address === ethers.ZeroAddress && !allowZeroAddress) {
    return {
      isValid: false,
      errorMessage: "Cannot use zero address"
    };
  }

  // Check if address is user's own address (for delegation)
  if (
    userAddress &&
    !allowSelfDelegation &&
    address.toLowerCase() === userAddress.toLowerCase()
  ) {
    return {
      isValid: false,
      errorMessage: "You cannot delegate to yourself"
    };
  }

  return {
    isValid: true,
    errorMessage: ""
  };
}

/**
 * Validates token amounts
 */
export function validateTokenAmount(
  amount: string,
  options: TokenAmountValidationOptions = {}
): ValidationResult {
  const {
    min,
    max,
    allowZero = false,
    decimals = 18,
    userBalance,
  } = options;

  // Check if empty
  if (!amount.trim()) {
    return { isValid: false, errorMessage: 'Amount is required' };
  }

  // Check if valid number format
  if (!/^(\d+\.?\d*|\.\d+)$/.test(amount)) {
    return { isValid: false, errorMessage: 'Please enter a valid number' };
  }

  const numAmount = parseFloat(amount);
  
  // Check if NaN
  if (isNaN(numAmount)) {
    return { isValid: false, errorMessage: 'Please enter a valid number' };
  }

  // Check if zero
  if (numAmount === 0 && !allowZero) {
    return { isValid: false, errorMessage: 'Amount must be greater than zero' };
  }

  // Check minimum value
  if (min !== undefined && numAmount < parseFloat(min.toString())) {
    return { isValid: false, errorMessage: `Amount must be at least ${min}` };
  }

  // Check maximum value
  if (max !== undefined && numAmount > parseFloat(max.toString())) {
    return { isValid: false, errorMessage: `Amount cannot exceed ${max}` };
  }

  // Check decimal places
  const decimalPart = amount.includes('.') ? amount.split('.')[1].length : 0;
  if (decimalPart > decimals) {
    return { isValid: false, errorMessage: `Amount cannot have more than ${decimals} decimal places` };
  }

  // Check against user balance
  if (userBalance !== undefined && parseFloat(userBalance.toString()) < numAmount) {
    return { isValid: false, errorMessage: `Insufficient balance. You have ${parseFloat(userBalance.toString()).toFixed(4)}` };
  }

  return { isValid: true, errorMessage: "" };
}

/**
 * Validates proposal titles
 */
export function validateProposalTitle(title: string): ValidationResult {
  if (!title || title.trim() === "") {
    return {
      isValid: false,
      errorMessage: "Title is required"
    };
  }

  if (title.length < 5) {
    return {
      isValid: false,
      errorMessage: "Title must be at least 5 characters"
    };
  }

  if (title.length > 100) {
    return {
      isValid: false,
      errorMessage: "Title cannot exceed 100 characters"
    };
  }

  return { isValid: true, errorMessage: "" };
}

/**
 * Validates proposal descriptions
 */
export function validateProposalDescription(description: string): ValidationResult {
  if (!description || description.trim() === "") {
    return {
      isValid: false,
      errorMessage: "Description is required"
    };
  }

  if (description.length < 20) {
    return {
      isValid: false,
      errorMessage: "Description must be at least 20 characters"
    };
  }

  if (description.length > 10000) {
    return {
      isValid: false,
      errorMessage: "Description cannot exceed 10,000 characters"
    };
  }

  return { isValid: true, errorMessage: "" };
}

/**
 * Validates proposal duration (in days)
 */
export function validateProposalDuration(days: string | number): ValidationResult {
  const duration = typeof days === "string" ? parseInt(days) : days;

  if (isNaN(duration)) {
    return {
      isValid: false,
      errorMessage: "Duration must be a valid number"
    };
  }

  if (duration <= 0) {
    return {
      isValid: false,
      errorMessage: "Duration must be greater than 0"
    };
  }

  if (duration > 30) {
    return {
      isValid: false,
      errorMessage: "Duration cannot exceed 30 days"
    };
  }

  if (Math.floor(duration) !== duration) {
    return {
      isValid: false,
      errorMessage: "Duration must be a whole number"
    };
  }

  return { isValid: true, errorMessage: "" };
}

/**
 * Utility function to check if user has sufficient voting power
 */
export function validateVotingPower(
  votingPower: string | number
): ValidationResult {
  const power = typeof votingPower === "string" 
    ? parseFloat(votingPower) 
    : votingPower;

  if (isNaN(power)) {
    return {
      isValid: false,
      errorMessage: "Invalid voting power"
    };
  }

  if (power <= 0) {
    return {
      isValid: false,
      errorMessage: "You need tokens to vote or delegate. Please acquire some tokens first."
    };
  }

  return { isValid: true, errorMessage: "" };
}

/**
 * Common function for validating email addresses
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || email.trim() === "") {
    return {
      isValid: false,
      errorMessage: "Email is required"
    };
  }
  
  // Simple regex for email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      isValid: false,
      errorMessage: "Please enter a valid email address"
    };
  }
  
  return { isValid: true, errorMessage: "" };
}

/**
 * Common function for validating passwords
 */
export function validatePassword(
  password: string,
  options: {
    minLength?: number;
    requireUppercase?: boolean;
    requireLowercase?: boolean;
    requireNumbers?: boolean;
    requireSpecialChars?: boolean;
  } = {}
): ValidationResult {
  const {
    minLength = 8,
    requireUppercase = true,
    requireLowercase = true,
    requireNumbers = true,
    requireSpecialChars = true
  } = options;
  
  if (!password) {
    return {
      isValid: false,
      errorMessage: "Password is required"
    };
  }
  
  if (password.length < minLength) {
    return {
      isValid: false,
      errorMessage: `Password must be at least ${minLength} characters`
    };
  }
  
  if (requireUppercase && !/[A-Z]/.test(password)) {
    return {
      isValid: false,
      errorMessage: "Password must include at least one uppercase letter"
    };
  }
  
  if (requireLowercase && !/[a-z]/.test(password)) {
    return {
      isValid: false,
      errorMessage: "Password must include at least one lowercase letter"
    };
  }
  
  if (requireNumbers && !/\d/.test(password)) {
    return {
      isValid: false,
      errorMessage: "Password must include at least one number"
    };
  }
  
  if (requireSpecialChars && !/[^A-Za-z0-9]/.test(password)) {
    return {
      isValid: false,
      errorMessage: "Password must include at least one special character"
    };
  }
  
  return { isValid: true, errorMessage: "" };
} 