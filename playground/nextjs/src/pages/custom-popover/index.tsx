import * as Popover from '@radix-ui/react-popover';
import { BellIcon, Cross2Icon } from '@radix-ui/react-icons';
import { Inbox, Bell, Notifications } from '@novu/react';
import { novuConfig } from '@/utils/config';
import styles from './custom-popover.module.css';

export default function Home() {
  return (
    <Inbox {...novuConfig}>
      <Popover.Root>
        <Popover.Trigger asChild>
          <button>
            <Bell>
              {({ unreadCount }) => (
                <div>
                  <span>{unreadCount}</span>
                  <BellIcon />
                </div>
              )}
            </Bell>
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content className={styles.PopoverContent} sideOffset={5}>
            <Notifications />
            <Popover.Close className={styles.PopoverClose} aria-label="Close">
              <Cross2Icon />
            </Popover.Close>
            <Popover.Arrow className={styles.PopoverArrow} />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </Inbox>
  );
}
