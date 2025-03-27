const hre = require("hardhat");

async function main() {
  // The address that will receive the minted tokens
  const RECIPIENT_ADDRESS = "YOUR_WALLET_ADDRESS_HERE"; // Replace with your wallet address
  
  // Amount to mint - 1000 tokens
  const AMOUNT_TO_MINT = hre.ethers.parseUnits("1000", 18);
  
  // Get the GovernanceToken contract instance
  console.log("Getting the GovernanceToken contract instance...");
  const tokenAddress = "0x775F4A912a09291Ae31422b149E0c37760C7AB02";
  const TokenContract = await hre.ethers.getContractFactory("GovernanceToken");
  const token = await TokenContract.attach(tokenAddress);
  
  // Mint tokens
  console.log(`Minting ${hre.ethers.formatUnits(AMOUNT_TO_MINT, 18)} tokens to ${RECIPIENT_ADDRESS}...`);
  const tx = await token.mint(RECIPIENT_ADDRESS, AMOUNT_TO_MINT);
  await tx.wait();
  
  console.log("Tokens minted successfully!");
  
  // Check balance
  const balance = await token.balanceOf(RECIPIENT_ADDRESS);
  console.log(`New balance of ${RECIPIENT_ADDRESS}: ${hre.ethers.formatUnits(balance, 18)} GVTOKEN`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 