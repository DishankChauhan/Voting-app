import { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import './globals.css';
import ClientProviders from './providers';

export const metadata: Metadata = {
  title: 'Decentralized Voting App',
  description: 'A decentralized voting application built on Ethereum blockchain',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <ClientProviders>
          <div className="min-h-screen bg-slate-900 text-white">
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 3000,
                style: {
                  background: '#1E293B',
                  color: '#fff',
                },
              }}
            />
            {children}
          </div>
        </ClientProviders>
      </body>
    </html>
  );
} 