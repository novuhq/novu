import { Bell, Inbox, InboxContent } from '@novu/nextjs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import Title from '@/components/Title';
import { novuConfig } from '@/utils/config';

/**
 * The engine's default bell inside a host popover trigger, with the bell icon overridden. The icon is React content
 * rendered into an engine outlet, so a click on it must still reach the trigger around the bell.
 */
export default function CustomPopoverIconsPage() {
  return (
    <>
      <Title title="Custom popover with a custom bell icon" />
      <Inbox
        {...novuConfig}
        appearance={{
          icons: {
            bell: () => <span data-testid="custom-bell-icon">🔔</span>,
          },
        }}
      >
        <Popover>
          <PopoverTrigger>
            <Bell />
          </PopoverTrigger>
          <PopoverContent className="h-[600px] w-[400px] overflow-hidden p-0">
            <InboxContent />
          </PopoverContent>
        </Popover>
      </Inbox>
    </>
  );
}
