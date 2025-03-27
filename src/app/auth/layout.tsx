'use client';

import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="min-h-screen bg-slate-900 flex items-center justify-center">
      {children}
    </section>
  );
} 