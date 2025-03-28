import { Inter } from 'next/font/google';
import type { Metadata } from 'next';
import { AuthProvider } from '@/context/AuthContext';
import { FirebaseAuthProvider } from '@/context/FirebaseAuthContext';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from 'next-themes';
import './globals.css';
import { AnimeNavBar } from '@/components/ui/anime-navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'DAO Voting',
  description: 'A decentralized governance platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <FirebaseAuthProvider>
          <AuthProvider>
            <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
              <main className="min-h-screen">
                <AnimeNavBar />
                {children}
                <Toaster position="bottom-right" />
              </main>
            </ThemeProvider>
          </AuthProvider>
        </FirebaseAuthProvider>
      </body>
    </html>
  );
} 