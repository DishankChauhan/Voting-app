'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ConnectWallet from '../wallet/ConnectWallet';
import NotificationMenu from '../notification/NotificationMenu';

const Navbar = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Close mobile menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Don't show navbar on landing and auth pages
  if (pathname === '/landing' || pathname.startsWith('/auth/')) {
    return null;
  }

  return (
    <nav className="bg-gray-900 border-b border-gray-800 py-4">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <div className="bg-indigo-600 w-8 h-8 rounded-lg flex items-center justify-center mr-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-white">DAO Voting</span>
            </Link>
            
            {/* Desktop navigation */}
            <div className="hidden md:flex ml-10 space-x-8">
              <Link 
                href="/proposals" 
                className={`text-sm font-medium transition ${
                  pathname.startsWith('/proposals') 
                    ? 'text-indigo-400' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Proposals
              </Link>
              <Link 
                href="/delegates" 
                className={`text-sm font-medium transition ${
                  pathname.startsWith('/delegates') 
                    ? 'text-indigo-400' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Delegates
              </Link>
              {user?.walletAddress && (
                <Link 
                  href="/profile" 
                  className={`text-sm font-medium transition ${
                    pathname.startsWith('/profile') 
                      ? 'text-indigo-400' 
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Profile
                </Link>
              )}
              {user?.isAdmin && (
                <Link 
                  href="/admin" 
                  className={`text-sm font-medium transition ${
                    pathname.startsWith('/admin') 
                      ? 'text-indigo-400' 
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Admin
                </Link>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="hidden md:block">
              <ConnectWallet variant="default" />
            </div>
            
            {user && <NotificationMenu />}
            
            {user ? (
              <div className="hidden md:flex items-center space-x-4">
                <div className="text-sm text-gray-300">
                  {user.displayName || user.email || 'User'}
                </div>
                <button
                  onClick={logout}
                  className="text-sm text-gray-400 hover:text-white transition"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center space-x-4">
                <Link 
                  href="/auth/login" 
                  className="text-sm text-gray-300 hover:text-white transition"
                >
                  Login
                </Link>
                <Link 
                  href="/auth/register" 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm py-2 px-4 rounded transition"
                >
                  Sign Up
                </Link>
              </div>
            )}
            
            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden text-gray-300 hover:text-white focus:outline-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
        
        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-gray-800">
            <div className="flex flex-col space-y-3">
              <Link 
                href="/proposals" 
                className={`text-sm font-medium py-2 transition ${
                  pathname.startsWith('/proposals') 
                    ? 'text-indigo-400' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Proposals
              </Link>
              <Link 
                href="/delegates" 
                className={`text-sm font-medium py-2 transition ${
                  pathname.startsWith('/delegates') 
                    ? 'text-indigo-400' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Delegates
              </Link>
              {user?.walletAddress && (
                <Link 
                  href="/profile" 
                  className={`text-sm font-medium py-2 transition ${
                    pathname.startsWith('/profile') 
                      ? 'text-indigo-400' 
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Profile
                </Link>
              )}
              {user?.isAdmin && (
                <Link 
                  href="/admin" 
                  className={`text-sm font-medium py-2 transition ${
                    pathname.startsWith('/admin') 
                      ? 'text-indigo-400' 
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Admin
                </Link>
              )}
              
              <div className="py-2">
                <ConnectWallet fullWidth variant="default" />
              </div>
              
              {user && (
                <div className="flex items-center space-x-2 py-2">
                  <NotificationMenu />
                  <span className="text-sm text-gray-400">Notifications</span>
                </div>
              )}
              
              {user ? (
                <>
                  <div className="text-sm text-gray-300 py-2">
                    {user.displayName || user.email || 'User'}
                  </div>
                  <button
                    onClick={logout}
                    className="text-sm text-left text-gray-400 hover:text-white py-2 transition"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link 
                    href="/auth/login" 
                    className="text-sm text-gray-300 hover:text-white py-2 transition"
                  >
                    Login
                  </Link>
                  <Link 
                    href="/auth/register" 
                    className="text-sm text-gray-300 hover:text-white py-2 transition"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar; 