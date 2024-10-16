import { ReactNode } from 'react';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { IntercomProvider } from 'react-use-intercom';
import { HeaderNavigation } from './header-navigation';
import { INTERCOM_APP_ID } from '@/config';

export const EditWorkflowLayout = ({
  children,
  headerStartItems,
}: {
  children: ReactNode;
  headerStartItems?: ReactNode;
}) => {
  return (
    <IntercomProvider appId={INTERCOM_APP_ID}>
      <div className="relative flex h-full w-full">
        <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
          <HeaderNavigation startItems={headerStartItems} />

          <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden">{children}</div>
        </div>
      </div>
    </IntercomProvider>
  );
};
