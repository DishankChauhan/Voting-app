'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { logger } from '@/utils/logger';

interface ProtectedRouteProps {
  children: ReactNode;
  requireWallet?: boolean; // If true, requires both authentication and wallet connection
}

const ProtectedRoute = ({ children, requireWallet = true }: ProtectedRouteProps) => {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    if (!loading) {
      // Check if user is authenticated
      if (!user) {
        logger.debug('User not authenticated, redirecting to login page');
        router.push('/auth/login');
      } 
      // If requireWallet is true, also check if wallet is connected
      else if (requireWallet && !user.walletAddress) {
        logger.debug('Wallet not connected, redirecting to profile page');
        router.push('/profile');
      } else {
        setIsVerifying(false);
      }
    }
  }, [user, loading, router, requireWallet]);

  // Show nothing while verifying to avoid flash of content
  if (loading || isVerifying) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute; 