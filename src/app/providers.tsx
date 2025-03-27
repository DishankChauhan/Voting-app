'use client';

import { ReactNode } from 'react';
import { FirebaseAuthProvider } from '@/context/FirebaseAuthContext';
import { AuthProvider } from '@/context/AuthContext';

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <FirebaseAuthProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </FirebaseAuthProvider>
  );
} 