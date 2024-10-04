import { ReactNode } from 'react';

export const AuthLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="grid h-screen grid-cols-2 gap-8">
      <div className="grow">Auth Layout</div>
      <div className="flex items-center justify-center">{children}</div>
    </div>
  );
};
