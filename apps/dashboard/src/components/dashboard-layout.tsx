import { ReactNode } from 'react';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { IntercomProvider } from 'react-use-intercom';
import { SideNavigation } from './side-navigation';
import { HeaderNavigation } from './header-navigation';
import { INTERCOM_APP_ID } from '@/config';

export const DashboardLayout = ({
  children,
  headerStartItems,
}: {
  children: ReactNode;
  headerStartItems?: ReactNode;
}) => {
  return (
    <IntercomProvider appId={INTERCOM_APP_ID}>
      <div className="relative flex h-screen w-full">
        <SideNavigation />
        <div className="flex min-h-screen flex-1 flex-col overflow-y-auto overflow-x-hidden">
          <HeaderNavigation startItems={headerStartItems} />
          <div className="overflow-y-auto overflow-x-hidden">{children}</div>
        </div>
      </div>
    </IntercomProvider>
  );
};
