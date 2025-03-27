# Decentralized Voting App

A Web3 decentralized voting application built with Solidity, Next.js, Ethers.js, and Firebase.

## Features

- Connect to Ethereum wallet (MetaMask)
- Create voting proposals on the blockchain
- Vote on proposals
- View proposal details and results
- Secure on-chain voting with one vote per address
- Store additional metadata in Firebase

## Tech Stack

- **Smart Contract**: Solidity
- **Frontend**: Next.js, Tailwind CSS
- **Blockchain Interaction**: Ethers.js
- **Development Environment**: Hardhat
- **Authentication & Database**: Firebase
- **Testing**: Hardhat testing framework

## Prerequisites

- Node.js (v16+)
- npm or yarn
- MetaMask browser extension
- Firebase account
- Infura account (for deployment to testnets/mainnet)

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd eth-voting-app
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create or modify `.env.local` file in the root directory with the following variables:

```
# Smart Contract
NEXT_PUBLIC_CONTRACT_ADDRESS=<deployed-contract-address>

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=<your-firebase-api-key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<your-firebase-auth-domain>
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<your-firebase-project-id>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<your-firebase-storage-bucket>
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<your-firebase-messaging-sender-id>
NEXT_PUBLIC_FIREBASE_APP_ID=<your-firebase-app-id>

# Infura Configuration
NEXT_PUBLIC_INFURA_API_KEY=<your-infura-api-key>
```

For contract deployment to testnets or mainnet, create or modify `.env` file:

```
PRIVATE_KEY=<your-wallet-private-key>
INFURA_API_KEY=<your-infura-api-key>
```

### 4. Compile and deploy smart contract

```bash
# Compile the contract
npx hardhat compile

# Deploy to local hardhat network
npx hardhat run scripts/deploy.ts --network localhost

# Or deploy to a testnet (e.g., Sepolia)
npx hardhat run scripts/deploy.ts --network sepolia
```

Update the `NEXT_PUBLIC_CONTRACT_ADDRESS` in your `.env.local` file with the deployed contract address.

### 5. Start the development server

```bash
npm run dev
```

Visit http://localhost:3000 to see the application.

## Testing

```bash
# Run smart contract tests
npx hardhat test
```

## Deployment

### Smart Contract

```bash
# Deploy to the Ethereum mainnet
npx hardhat run scripts/deploy.ts --network mainnet
```

### Frontend

Deploy to Vercel:

```bash
vercel
```

## Project Structure

```
eth-voting-app/
├── contracts/              # Solidity smart contracts
├── scripts/                # Deployment scripts
├── test/                   # Smart contract tests
├── src/
│   ├── app/                # Next.js pages
│   ├── components/         # React components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Library files and configurations
│   └── services/           # Service functions (API calls, etc.)
├── .env                    # Environment variables (for contract deployment)
├── .env.local              # Local environment variables (for frontend)
├── hardhat.config.ts       # Hardhat configuration
└── package.json            # Project dependencies
```

## Future Enhancements

- Add token-weighted voting
- Implement delegation of votes
- Add proposal categories and filtering
- Create a governance token
- Implement quadratic voting
- Add off-chain signature verification
