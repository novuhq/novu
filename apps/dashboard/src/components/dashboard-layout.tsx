import { ReactNode } from 'react';
import { UserProfile } from '@/components/user-profile';

export const DashboardLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="relative min-h-dvh">
      <div className="fixed left-0 top-0 flex h-16 w-full items-center justify-center bg-green-200 p-4">
        <a
          href="/legacy/integrations"
          target="_self"
          className="text-blue-600 visited:text-purple-600 hover:border-b hover:border-current"
        >
          Integrations
        </a>
        <div className="ml-auto">
          <UserProfile />
        </div>
      </div>

      <div className="pt-16">{children}</div>
    </div>
  );
};
