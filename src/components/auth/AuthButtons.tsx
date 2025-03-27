'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useFirebaseAuth } from '@/context/FirebaseAuthContext';
import { toast } from 'react-hot-toast';

export default function AuthButtons() {
  const { user, logout, loading } = useFirebaseAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to log out');
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="flex space-x-2">
        <div className="h-9 w-24 bg-gray-700 animate-pulse rounded"></div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center space-x-4">
        <span className="text-sm text-gray-300 hidden md:inline-block">
          {user.displayName || user.email}
        </span>
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm transition"
        >
          {isLoggingOut ? 'Logging out...' : 'Log Out'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex space-x-2">
      <Link
        href="/auth/login"
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm transition"
      >
        Log In
      </Link>
      <Link
        href="/auth/register"
        className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm transition"
      >
        Register
      </Link>
    </div>
  );
} 