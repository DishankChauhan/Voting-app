import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

// Add your Ethereum accounts private keys and Alchemy API keys to your .env file
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || "";

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    hardhat: {},
    localhost: {
      url: "http://127.0.0.1:8545",
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

// Only add the sepolia and mainnet networks if we have a valid private key
if (PRIVATE_KEY && PRIVATE_KEY.length === 64 && ALCHEMY_API_KEY) {
  config.networks!.sepolia = {
    url: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    accounts: [`0x${PRIVATE_KEY}`],
  };
  
  config.networks!.mainnet = {
    url: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    accounts: [`0x${PRIVATE_KEY}`],
  };
}

export default config;
