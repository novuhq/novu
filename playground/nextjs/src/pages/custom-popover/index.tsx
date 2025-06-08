import { novuConfig } from '@/utils/config';
import { Bell, Inbox, InboxContent } from '@novu/nextjs';
import { BellIcon } from '@radix-ui/react-icons';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export default function CustomPopoverPage() {
  return (
    <Inbox {...novuConfig}>
      <Popover>
        <PopoverTrigger>
          <Bell
            renderBell={(unreadCount) => (
              <div>
                <span>{unreadCount}</span>
                <BellIcon />
              </div>
            )}
          />
        </PopoverTrigger>
        <PopoverContent className="h-[600px] w-[400px] overflow-hidden p-0">
          <InboxContent />
        </PopoverContent>
      </Popover>
    </Inbox>
  );
}
