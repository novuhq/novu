import { Popover, PopoverContent, PopoverPortal, PopoverTrigger } from '@/components/primitives/popover';
import { API_HOSTNAME, APP_ID, WEBSOCKET_HOSTNAME } from '@/config';
import { useEnvironment } from '@/context/environment/hooks';
import { useTestPage } from '@/hooks/use-test-page';
import { useUser } from '@clerk/clerk-react';
import { Bell, Inbox, InboxContent, useNovu } from '@novu/react';
import { useEffect, useState } from 'react';
import { HeaderButton } from './header-navigation/header-button';
import { InboxBellFilled } from './icons/inbox-bell-filled';

declare global {
  interface Window {
    Clerk: {
      session: {
        getToken: (options: { template: string }) => Promise<string>;
      };
    };
  }
}

const InboxInner = () => {
  const [open, setOpen] = useState(false);
  const [jingle, setJingle] = useState(false);
  const { isTestPage } = useTestPage();

  const novu = useNovu();
  useEffect(() => {
    // Store a timeout to debounce the jingle animation, preventing the bell from
    // becoming jittery when multiple notifications are received in quick succession.
    let timeout: NodeJS.Timeout;

    const cleanup = novu.on('notifications.notification_received', () => {
      setJingle(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setJingle(false), 3000);
    });

    return () => {
      clearTimeout(timeout);
      cleanup();
    };
  }, [novu]);

  return (
    <Popover onOpenChange={setOpen}>
      <PopoverTrigger tabIndex={-1}>
        <Bell
          renderBell={(unreadCount) => (
            <HeaderButton
              label={
                <>
                  Inbox
                  {isTestPage && ' (Test)'}
                  {unreadCount > 0 && ` (${unreadCount})`}
                </>
              }
              disableTooltip={open}
              className={isTestPage ? 'bg-test-pattern' : ''}
            >
              <div className="relative flex items-center justify-center">
                <InboxBellFilled
                  className={`text-foreground-600 size-4 cursor-pointer stroke-[0.5px]`}
                  bellClassName={`origin-top ${jingle ? 'animate-swing' : ''}`}
                  ringerClassName={`origin-top ${jingle ? 'animate-jingle' : ''}`}
                  codeClassName={isTestPage ? 'block' : 'hidden'}
                />
                {unreadCount > 0 && (
                  <div className="absolute right-[-4px] top-[-6px] flex h-3 w-3 items-center justify-center rounded-full border-[3px] border-[white] bg-white">
                    <span className="bg-destructive block h-1.5 w-1.5 animate-[pulse-shadow_1s_ease-in-out_infinite] rounded-full [--pulse-color:var(--destructive)] [--pulse-size:3px]"></span>
                  </div>
                )}
              </div>
            </HeaderButton>
          )}
        />
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContent
          side="bottom"
          align="end"
          className="h-[500px] w-[350px] overflow-y-auto p-0 [&>div:first-child]:[&>div:first-child]:h-full [&>div:first-child]:h-full"
        >
          <InboxContent />
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
};

export const InboxButton = () => {
  const { user } = useUser();
  const { currentEnvironment } = useEnvironment();
  const { isTestPage } = useTestPage();

  if (!user || !currentEnvironment) {
    return null;
  }

  /**
   * If the page is a test page, we use the environment identifier as the appId.
   *
   * This displays a test inbox, where the user can see their test notifications appear
   * in real-time.
   */
  const appId = isTestPage ? currentEnvironment?.identifier : APP_ID;

  const localizationTestSuffix = isTestPage ? ' (Test)' : '';

  return (
    <Inbox
      subscriberId={user.externalId ?? ''}
      applicationIdentifier={appId}
      backendUrl={API_HOSTNAME}
      socketUrl={WEBSOCKET_HOSTNAME}
      localization={{
        'inbox.filters.labels.default': `Inbox${localizationTestSuffix}`,
        'inbox.filters.labels.unread': `Unread${localizationTestSuffix}`,
        'inbox.filters.labels.archived': `Archived${localizationTestSuffix}`,
        'preferences.title': `Preferences${localizationTestSuffix}`,
        'notifications.emptyNotice': `${isTestPage ? 'This is a test inbox. Send a notification to preview it in real-time.' : 'No notifications'}`,
      }}
    >
      <InboxInner />
    </Inbox>
  );
};
