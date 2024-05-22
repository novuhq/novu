import React from 'react';
import { useAuth } from '../hooks';

export function SignedIn({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
