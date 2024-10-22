import { ReactNode } from 'react';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { IntercomProvider } from 'react-use-intercom';
import { INTERCOM_APP_ID } from '@/config';
import { HeaderNavigation } from '@/components/header-navigation/header-navigation';

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
          <HeaderNavigation startItems={headerStartItems} hideBridgeUrl />

          <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden">{children}</div>
        </div>
      </div>
    </IntercomProvider>
  );
};
