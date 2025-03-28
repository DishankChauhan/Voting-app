const hre = require("hardhat");

// At the top of the file, add this simple logger
const logger = {
  info: (...args) => console.log(...args),
  error: (...args) => console.error(...args),
};

async function main() {
  // The address that will receive the minted tokens
  const RECIPIENT_ADDRESS = "YOUR_WALLET_ADDRESS_HERE"; // Replace with your wallet address
  
  // Amount to mint - 1000 tokens
  const AMOUNT_TO_MINT = hre.ethers.parseUnits("1000", 18);
  
  // Get the GovernanceToken contract instance
  logger.info("Getting the GovernanceToken contract instance...");
  const tokenAddress = "0x775F4A912a09291Ae31422b149E0c37760C7AB02";
  const TokenContract = await hre.ethers.getContractFactory("GovernanceToken");
  const token = await TokenContract.attach(tokenAddress);
  
  // Mint tokens
  logger.info(`Minting ${hre.ethers.formatUnits(AMOUNT_TO_MINT, 18)} tokens to ${RECIPIENT_ADDRESS}...`);
  const tx = await token.mint(RECIPIENT_ADDRESS, AMOUNT_TO_MINT);
  await tx.wait();
  
  logger.info("Tokens minted successfully!");
  
  // Check balance
  const balance = await token.balanceOf(RECIPIENT_ADDRESS);
  logger.info(`New balance of ${RECIPIENT_ADDRESS}: ${hre.ethers.formatUnits(balance, 18)} GVTOKEN`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error(error);
    process.exit(1);
  }); 