import { ReactNode } from 'react';
import { UserProfile } from '@/components/user-profile';
import { InboxButton } from '@/components/inbox-button';
import { SideNavigation } from './side-navigation';

export const DashboardLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="relative flex w-full">
      <SideNavigation />
      <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <div className="bg-background flex h-16 w-full items-center justify-between border-b p-4">
          <a
            href="/legacy/integrations"
            target="_self"
            className="text-blue-600 visited:text-purple-600 hover:border-b hover:border-current"
          >
            Integrations
          </a>
          <div className="flex gap-4">
            <InboxButton />
            <UserProfile />
          </div>
        </div>

        <div className="flex min-h-[calc(100dvh-4rem)] flex-col overflow-y-auto overflow-x-hidden">{children}</div>
      </div>
    </div>
  );
};
