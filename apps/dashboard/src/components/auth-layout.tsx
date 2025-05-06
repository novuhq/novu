import { ReactNode } from 'react';
import { Toaster } from './primitives/sonner';

export const AuthLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[url('/images/auth/background.svg')] bg-cover bg-no-repeat">
      <Toaster />

      <div className="flex w-full flex-1 flex-row items-center justify-center">{children}</div>
    </div>
  );
};
