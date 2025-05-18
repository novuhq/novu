import { ReactNode } from 'react';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { IntercomProvider } from 'react-use-intercom';
import { INTERCOM_APP_ID } from '@/config';
import { HeaderNavigation } from '@/components/header-navigation/header-navigation';
import { InlineToast } from './primitives/inline-toast';
import { useAuth } from '@/context/auth/hooks';
import { PermissionsEnum } from '@novu/shared';

export const EditWorkflowLayout = ({
  children,
  headerStartItems,
}: {
  children: ReactNode;
  headerStartItems?: ReactNode;
}) => {
  const { has } = useAuth();

  const isReadOnly = !has?.({ permission: PermissionsEnum.WORKFLOW_CREATE });

  return (
    <IntercomProvider appId={INTERCOM_APP_ID}>
      <div className="relative flex h-full w-full">
        <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
          <HeaderNavigation startItems={headerStartItems} hideBridgeUrl />

          <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
            {children}

            {isReadOnly && (
              <div className="absolute bottom-4 left-4 z-50">
                <InlineToast
                  className="border border-gray-200 bg-white"
                  variant={'warning'}
                  description="Nice! You can see this, but changes are locked down."
                  title="View-only mode: "
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </IntercomProvider>
  );
};
