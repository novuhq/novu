import { useUser } from '@clerk/clerk-react';
import { Bell, Inbox, InboxContent, useNovu } from '@novu/react';
import { useEffect, useState } from 'react';
import { Popover, PopoverContent, PopoverPortal, PopoverTrigger } from '@/components/primitives/popover';
import { API_HOSTNAME, APP_ID, IS_SELF_HOSTED, WEBSOCKET_HOSTNAME } from '@/config';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment } from '@/context/environment/hooks';
import { useWorkflowEditorPage } from '@/hooks/use-workflow-editor-page';
import { HeaderButton } from './header-navigation/header-button';
import { InboxBellFilledDev } from './icons/inbox-bell-filled-dev';

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
  const { isWorkflowEditorPage } = useWorkflowEditorPage();

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
                  {isWorkflowEditorPage && ' (Test)'}
                  {unreadCount.total > 0 && ` (${unreadCount.total})`}
                </>
              }
              disableTooltip={open}
              className={isWorkflowEditorPage ? 'bg-test-pattern' : ''}
            >
              <div className="relative flex items-center justify-center">
                <InboxBellFilledDev
                  className={`text-foreground-600 size-4 cursor-pointer stroke-[0.5px]`}
                  bellClassName={`origin-top ${jingle ? 'animate-swing' : ''}`}
                  ringerClassName={`origin-top ${jingle ? 'animate-jingle' : ''}`}
                  codeClassName={isWorkflowEditorPage ? 'block' : 'hidden'}
                />
                {unreadCount.total > 0 && (
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
        <PopoverContent side="bottom" align="end" className="h-[550px] w-[350px] overflow-hidden p-0">
          <InboxContent />
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
};

export const InboxButton = () => {
  const { user } = useUser();
  const { currentEnvironment } = useEnvironment();
  const { isWorkflowEditorPage: isTestPage } = useWorkflowEditorPage();
  const { currentOrganization } = useAuth();

  if (!user?.externalId || !currentEnvironment || !currentOrganization) {
    return null;
  }

  if (!isTestPage && IS_SELF_HOSTED) {
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
      subscriberId={isTestPage ? user.externalId : `org_${currentOrganization._id}:user_${user.externalId}`}
      applicationIdentifier={appId}
      /**
       * We want to ensure our staging environment is using the production API and WebSocket endpoints.
       */
      backendUrl={API_HOSTNAME === 'https://api.novu-staging.co' && !isTestPage ? 'https://api.novu.co' : API_HOSTNAME}
      socketUrl={
        WEBSOCKET_HOSTNAME === 'https://socket.novu-staging.co' && !isTestPage
          ? 'https://ws.novu.co'
          : WEBSOCKET_HOSTNAME
      }
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
