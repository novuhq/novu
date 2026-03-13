import { ReactNode } from 'react';
import { Toaster } from './primitives/sonner';

export const AuthLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex min-h-screen items-center justify-center overflow-auto bg-[url('/images/auth/background.svg')] bg-cover bg-no-repeat p-4 md:p-0">
      <Toaster />

      <div className="flex w-full flex-1 flex-row items-center justify-center">{children}</div>
    </div>
  );
};
