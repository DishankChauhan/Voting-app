'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';
import { logger } from '@/utils/logger';

// Paths that do not require authentication
const PUBLIC_PATHS = [
  '/landing',
  '/auth/login',
  '/auth/register',
  '/auth/reset-password',
];

export default function RedirectManager() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Don't redirect while still loading
    if (loading) return;
    
    // Prevent multiple redirects in one session
    if (hasRedirected.current) return;
    
    // Check if the current path is a public path
    const isPublicPath = PUBLIC_PATHS.some(path => 
      pathname === path || pathname.startsWith(path + '/')
    );

    // If authenticated and on public path, redirect to home
    if (user && isPublicPath) {
      logger.debug('Authenticated user on public path, redirecting to home', { pathname });
      hasRedirected.current = true;
      window.location.href = '/';
      return;
    }
    
    // If not authenticated and not on public path, redirect to landing
    if (!user && !isPublicPath && pathname !== '/') {
      logger.debug('Unauthenticated user on protected path, redirecting to landing', { pathname });
      hasRedirected.current = true;
      window.location.href = '/landing';
      return;
    }
  }, [user, loading, pathname]);

  // This component doesn't render anything
  return null;
} 