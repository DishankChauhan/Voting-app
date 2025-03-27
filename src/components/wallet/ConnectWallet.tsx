'use client';

import { useState, useEffect } from 'react';

const ConnectWallet = () => {
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  useEffect(() => {
    checkIfWalletIsConnected();
  }, []);

  const checkIfWalletIsConnected = async () => {
    try {
      const { ethereum } = window as any;

      if (!ethereum) {
        setConnectError('MetaMask is not installed. Please install it to use this app.');
        return;
      }

      const accounts = await ethereum.request({ method: 'eth_accounts' });

      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
        setIsConnected(true);
      }
    } catch (error) {
      console.error('Error checking if wallet is connected:', error);
      setConnectError('Failed to connect to your wallet.');
    }
  };

  const connectWallet = async () => {
    try {
      const { ethereum } = window as any;

      if (!ethereum) {
        setConnectError('MetaMask is not installed. Please install it to use this app.');
        return;
      }

      const accounts = await ethereum.request({
        method: 'eth_requestAccounts',
      });

      setWalletAddress(accounts[0]);
      setIsConnected(true);
      setConnectError(null);
    } catch (error) {
      console.error('Error connecting to wallet:', error);
      setConnectError('Failed to connect to your wallet.');
    }
  };

  const disconnectWallet = () => {
    setWalletAddress('');
    setIsConnected(false);
  };

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div className="flex items-center justify-center">
      {isConnected ? (
        <div className="flex flex-col items-center">
          <div className="bg-green-900/30 text-green-400 font-medium py-1 px-3 rounded-full text-sm mb-2 border border-green-800">
            Connected: {formatAddress(walletAddress)}
          </div>
          <button
            onClick={disconnectWallet}
            className="dark-button-danger py-2 px-4 rounded-lg transition-colors"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <button
            onClick={connectWallet}
            className="dark-button-primary py-2 px-4 rounded-lg transition-colors"
          >
            Connect Wallet
          </button>
          {connectError && <p className="text-red-400 text-sm mt-2">{connectError}</p>}
        </div>
      )}
    </div>
  );
};

export default ConnectWallet; 