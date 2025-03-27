const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Deploy the GovernanceToken contract
  console.log("Deploying GovernanceToken contract...");
  const Token = await hre.ethers.getContractFactory("GovernanceToken");
  const initialSupply = hre.ethers.parseUnits("1000000", 18); // 1 million tokens
  const maxSupply = hre.ethers.parseUnits("10000000", 18); // 10 million tokens
  const token = await Token.deploy("Governance Token", "GVTOKEN", initialSupply, maxSupply);
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log(`GovernanceToken deployed to: ${tokenAddress}`);

  // Deploy the Voting contract with the token address
  console.log("Deploying Voting contract...");
  const Voting = await hre.ethers.getContractFactory("Voting");
  
  // 1000 tokens required to create a proposal
  const proposalThreshold = hre.ethers.parseUnits("1000", 18);
  // 100,000 tokens required for quorum
  const quorumVotes = hre.ethers.parseUnits("100000", 18);
  
  const voting = await Voting.deploy(tokenAddress, proposalThreshold, quorumVotes);
  await voting.waitForDeployment();
  const votingAddress = await voting.getAddress();
  console.log(`Voting contract deployed to: ${votingAddress}`);

  // Save contract addresses to .env.local for frontend use
  console.log("Saving contract addresses to .env files...");
  const networkName = hre.network.name;
  
  // Update .env.local file with contract addresses
  const envLocalPath = path.join(__dirname, "../.env.local");
  let envLocalContent = '';
  
  try {
    if (fs.existsSync(envLocalPath)) {
      envLocalContent = fs.readFileSync(envLocalPath, 'utf8');
    }
  } catch (error) {
    console.log("No existing .env.local file found. Creating a new one.");
  }
  
  // Update environment variables
  envLocalContent = envLocalContent
    .replace(/^NEXT_PUBLIC_VOTING_CONTRACT_ADDRESS=.*$/m, '')
    .replace(/^NEXT_PUBLIC_GOVERNANCE_TOKEN_ADDRESS=.*$/m, '');
  
  // Add contract addresses
  envLocalContent += `\n# Contract addresses for ${networkName} network\n`;
  envLocalContent += `NEXT_PUBLIC_VOTING_CONTRACT_ADDRESS=${votingAddress}\n`;
  envLocalContent += `NEXT_PUBLIC_GOVERNANCE_TOKEN_ADDRESS=${tokenAddress}\n`;
  
  // Write back to .env.local
  fs.writeFileSync(envLocalPath, envLocalContent);
  
  // Also update the contract config file
  console.log("Updating contract config file...");
  const configPath = path.join(__dirname, "../src/lib/contractConfig.ts");
  if (fs.existsSync(configPath)) {
    let configContent = fs.readFileSync(configPath, 'utf8');
    
    // Get network chain ID
    const network = await hre.ethers.provider.getNetwork();
    const chainId = network.chainId.toString();
    
    // Update the config for this network
    const networkConfigRegex = new RegExp(`"${chainId}":\\s*{[^}]*}`, 'g');
    
    if (networkConfigRegex.test(configContent)) {
      // Update existing network config
      configContent = configContent.replace(
        networkConfigRegex,
        `"${chainId}": {
    votingContract: "${votingAddress}",
    tokenContract: "${tokenAddress}",
    chainId: ${chainId}
  }`
      );
    } else {
      // Add new network config
      configContent = configContent.replace(
        /export const contractConfig: NetworkConfig = {/,
        `export const contractConfig: NetworkConfig = {
  // ${networkName} (Chain ID: ${chainId})
  "${chainId}": {
    votingContract: "${votingAddress}",
    tokenContract: "${tokenAddress}",
    chainId: ${chainId}
  },`
      );
    }
    
    fs.writeFileSync(configPath, configContent);
  }
  
  console.log("Deployment completed successfully!");
  console.log(`Make sure to update your frontend with these contract addresses:`);
  console.log(`Voting Contract: ${votingAddress}`);
  console.log(`Token Contract: ${tokenAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 