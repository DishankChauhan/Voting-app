import type { Metadata } from 'next';
import './globals.css';

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
        <div className="min-h-screen bg-slate-900 text-white">
          {children}
        </div>
      </body>
    </html>
  );
} 