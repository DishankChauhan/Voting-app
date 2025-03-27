'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useFirebaseAuth } from '@/context/FirebaseAuthContext';
import { getUserProfile, saveUserProfile } from '@/services/firebaseService';
import { toast } from 'react-hot-toast';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Link from 'next/link';

export default function ProfilePage() {
  const { user: firebaseUser } = useFirebaseAuth();
  const { user: walletUser, connectWallet } = useAuth();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLinking, setIsLinking] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (firebaseUser && firebaseUser.email) {
        try {
          const profile = await getUserProfile(firebaseUser.email.toLowerCase());
          setUserProfile(profile);
        } catch (error) {
          console.error('Error fetching user profile:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchUserProfile();
  }, [firebaseUser]);

  const handleLinkWallet = async () => {
    if (!firebaseUser || !firebaseUser.email) {
      toast.error('You must be logged in to link a wallet');
      return;
    }

    if (!walletUser || !walletUser.walletAddress) {
      await connectWallet();
      return;
    }

    setIsLinking(true);

    try {
      // Check if wallet is already linked
      const walletExists = userProfile?.walletAddresses?.includes(walletUser.walletAddress);

      if (walletExists) {
        toast.error('This wallet is already linked to your account');
        return;
      }

      // Add wallet to user's profile
      const walletAddresses = userProfile?.walletAddresses || [];
      await saveUserProfile(firebaseUser.email.toLowerCase(), {
        walletAddresses: [...walletAddresses, walletUser.walletAddress]
      });

      toast.success('Wallet linked successfully!');
      
      // Refresh profile data
      const updatedProfile = await getUserProfile(firebaseUser.email.toLowerCase());
      setUserProfile(updatedProfile);
    } catch (error) {
      console.error('Error linking wallet:', error);
      toast.error('Failed to link wallet');
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-center text-white">Your Profile</h1>
        
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500"></div>
          </div>
        ) : (
          <div className="max-w-lg mx-auto bg-gray-900 rounded-lg p-6 shadow-md">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4 text-white">Account Information</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-gray-400 text-sm">Display Name</p>
                  <p className="text-white">{firebaseUser?.displayName || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Email</p>
                  <p className="text-white">{firebaseUser?.email}</p>
                </div>
              </div>
            </div>
            
            <div className="mb-6 pt-6 border-t border-gray-800">
              <h2 className="text-xl font-semibold mb-4 text-white">Linked Wallets</h2>
              
              {userProfile?.walletAddresses?.length > 0 ? (
                <div className="space-y-2">
                  {userProfile.walletAddresses.map((address: string, index: number) => (
                    <div key={index} className="bg-gray-800 p-3 rounded text-gray-300 break-all font-mono text-sm">
                      {address}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No wallets linked yet</p>
              )}
              
              <div className="mt-4">
                <button
                  onClick={handleLinkWallet}
                  disabled={isLinking}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {!walletUser?.walletAddress
                    ? 'Connect Wallet'
                    : isLinking
                    ? 'Linking...'
                    : 'Link Current Wallet'}
                </button>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-800 text-center">
              <Link href="/" className="text-indigo-400 hover:text-indigo-300 text-sm">
                Back to Home
              </Link>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
} 