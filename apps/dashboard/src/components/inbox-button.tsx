import { useUser } from '@clerk/react';
import { Bell, Inbox, InboxContent, useNovu } from '@novu/react';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { getNovuInboxContext } from '@/api/novu-context';
import { Popover, PopoverContent, PopoverPortal, PopoverTrigger } from '@/components/primitives/popover';
import { APP_ID, IS_SELF_HOSTED } from '@/config';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useWorkflowEditorPage } from '@/hooks/use-workflow-editor-page';
import { apiHostnameManager } from '@/utils/api-hostname-manager';
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

const InboxInner = ({
  align = 'end',
  side = 'bottom',
}: {
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom' | 'left' | 'right';
}) => {
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
        <PopoverContent side={side} align={align} className="h-[550px] w-[350px] overflow-hidden p-0">
          <InboxContent />
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
};

export const InboxButton = ({
  align,
  side,
}: {
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom' | 'left' | 'right';
}) => {
  const { user } = useUser();
  const { currentEnvironment } = useEnvironment();
  const { isWorkflowEditorPage: isTestPage } = useWorkflowEditorPage();
  const { currentOrganization } = useAuth();
  const isNovuCopilotSlackEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_NOVU_COPILOT_SLACK_ENABLED, false);

  const appId = isTestPage ? currentEnvironment?.identifier : APP_ID;
  const localizationTestSuffix = isTestPage ? ' (Test)' : '';
  const isNovuProductionDashboard = window.location.hostname.includes('dashboard.novu.co');
  const isNovuStagingEnvironment = apiHostnameManager.getHostname() === 'https://api.novu-staging.co';
  const shouldUseProductionApi = (isNovuProductionDashboard || isNovuStagingEnvironment) && !isTestPage;

  const subscriber = useMemo(
    () => ({
      subscriberId: user?.externalId ?? '',
      email: user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? '',
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
    }),
    [user?.externalId, user?.primaryEmailAddress?.emailAddress, user?.emailAddresses, user?.firstName, user?.lastName]
  );

  // On the (non-test) dashboard Inbox we authenticate against Novu's own production account with the
  // shared APP_ID and the `<userId>` subscriber. If that production integration has HMAC enabled,
  // the session must carry a server-minted subscriberHash (+ tenant context/contextHash), so we mint
  // it the same way the NovuCopilot connect flow does. The test page talks to the customer's own
  // environment where none of this applies, hence it stays disabled there.
  const { data: connectContext } = useQuery({
    queryKey: ['novu-context', currentEnvironment?._id, subscriber.subscriberId],
    queryFn: ({ signal }) => {
      if (!currentEnvironment) {
        throw new Error('No environment selected');
      }

      return getNovuInboxContext(currentEnvironment, signal);
    },
    enabled:
      isNovuCopilotSlackEnabled &&
      !isTestPage &&
      !IS_SELF_HOSTED &&
      !!currentEnvironment?._id &&
      !!currentOrganization?._id &&
      !!user?.externalId,
    staleTime: 5 * 60 * 1000,
  });

  const localization = useMemo(
    () => ({
      'inbox.filters.labels.default': `Inbox${localizationTestSuffix}`,
      'inbox.filters.labels.unread': `Unread${localizationTestSuffix}`,
      'inbox.filters.labels.archived': `Archived${localizationTestSuffix}`,
      'preferences.title': `Preferences${localizationTestSuffix}`,
      'notifications.emptyNotice': `${isTestPage ? 'This is a test inbox. Send a notification to preview it in real-time.' : 'No notifications'}`,
    }),
    [isTestPage, localizationTestSuffix]
  );

  if (!user?.externalId || !currentEnvironment || !currentOrganization) {
    return null;
  }

  if (!isTestPage && IS_SELF_HOSTED) {
    return null;
  }

  return (
    <Inbox
      subscriber={subscriber}
      applicationIdentifier={appId}
      backendUrl={shouldUseProductionApi ? 'https://api.novu.co' : apiHostnameManager.getHostname()}
      socketUrl={shouldUseProductionApi ? 'https://ws.novu.co' : apiHostnameManager.getWebSocketHostname()}
      subscriberHash={isTestPage ? undefined : connectContext?.subscriberHash}
      context={isTestPage ? undefined : connectContext?.context}
      contextHash={isTestPage ? undefined : connectContext?.contextHash}
      localization={localization}
    >
      <InboxInner align={align} side={side} />
    </Inbox>
  );
};
