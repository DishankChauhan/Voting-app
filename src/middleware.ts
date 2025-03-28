import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Paths that do not require authentication
const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/reset-password',
  '/_next', // Next.js build files
  '/api', // API routes
  '/favicon.ico',
];

/**
 * Middleware function to handle routing based on authentication
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get auth cookies
  const authToken = request.cookies.get('auth-token')?.value;
  
  // Check if the path is public
  const isPublicPath = PUBLIC_PATHS.some(path => 
    pathname === path || pathname.startsWith(path + '/')
  );
  
  // Skip middleware for public paths
  if (isPublicPath) {
    return NextResponse.next();
  }
  
  // If no auth token and not a public path, redirect to login
  if (!authToken) {
    const url = new URL('/auth/login', request.url);
    
    // Save the original URL as the redirect URL (to redirect back after authentication)
    if (pathname !== '/') {
      url.searchParams.set('redirectUrl', pathname);
    }
    
    return NextResponse.redirect(url);
  }
  
  return NextResponse.next();
}

// Configure middleware to run only for relevant paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 