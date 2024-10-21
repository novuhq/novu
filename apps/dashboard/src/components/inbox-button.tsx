import { Popover, PopoverContent, PopoverTrigger, PopoverPortal } from '@/components/primitives/popover';
import { APP_ID } from '@/config';
import { useUser } from '@clerk/clerk-react';
import { Bell, Inbox, InboxContent } from '@novu/react';

export const InboxButton = () => {
  const { user } = useUser();

  if (!user) {
    return null;
  }

  return (
    <Inbox subscriberId={user.id} applicationIdentifier={APP_ID}>
      <Popover>
        <PopoverTrigger>
          <Bell />
        </PopoverTrigger>
        <PopoverPortal>
          <PopoverContent className="h-[500px] w-[350px] p-0">
            <InboxContent />
          </PopoverContent>
        </PopoverPortal>
      </Popover>
    </Inbox>
  );
};
