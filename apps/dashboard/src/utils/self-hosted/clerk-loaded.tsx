import React from 'react';
import { useAuth } from './use-auth';

type ClerkLoadedProps = {
  children: React.ReactNode;
};

export function ClerkLoaded({ children }: ClerkLoadedProps) {
  const { isLoaded } = useAuth();

  if (!isLoaded) {
    return null;
  }

  return <>{children}</>;
}
