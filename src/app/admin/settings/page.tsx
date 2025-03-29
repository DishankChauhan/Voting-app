'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Only allow admin access
  useEffect(() => {
    if (user && !user.isAdmin) {
      router.push('/');
    }
  }, [user, router]);

  if (user && !user.isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p>You don't have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Link 
          href="/admin" 
          className="mr-4 p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold">System Settings</h1>
      </div>
      
      <div className="bg-gray-800 rounded-lg p-8 text-center">
        <p className="text-gray-300 mb-4">System settings functionality coming soon</p>
        <p className="text-gray-500 text-sm">
          This section will allow administrators to configure application-wide settings,
          including protocol parameters, notification preferences, and system behavior.
        </p>
      </div>
    </div>
  );
} 