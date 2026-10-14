'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from '@/lib/auth';
import ThemeToggle from '@/components/ThemeToggle';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <ThemeToggle />
    </AuthProvider>
  );
}
