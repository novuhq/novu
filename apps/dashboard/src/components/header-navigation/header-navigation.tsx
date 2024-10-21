import { ReactNode } from 'react';
import { UserProfile } from '@/components/user-profile';
import { InboxButton } from '@/components/inbox-button';
import { CustomerSupportButton } from './customer-support-button';
import { EditBridgeUrlButton } from './edit-bridge-url-button';

export const HeaderNavigation = ({
  startItems,
  hideBridgeUrl = false,
}: {
  startItems?: ReactNode;
  hideBridgeUrl?: boolean;
}) => {
  return (
    <div className="bg-background flex w-full items-center justify-between border-b px-2.5 py-1.5">
      {startItems}
      <div className="text-foreground-600 ml-auto flex items-center gap-3">
        {!hideBridgeUrl ? <EditBridgeUrlButton /> : null}
        <CustomerSupportButton />
        <InboxButton />
        <UserProfile />
      </div>
    </div>
  );
};
