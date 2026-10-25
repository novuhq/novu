import { useUser } from '@clerk/react';
import { Bell, Inbox, InboxContent, useNovu } from '@novu/react';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNovuInboxContext } from '@/api/novu-context';
import { Popover, PopoverContent, PopoverPortal, PopoverTrigger } from '@/components/primitives/popover';
import { APP_ID, IS_SELF_HOSTED, SOCKET_OPTIONS } from '@/config';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment } from '@/context/environment/hooks';
import { useDashboardInboxHashes } from '@/hooks/use-dashboard-inbox-hashes';
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

type InboxButtonProps = {
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom' | 'left' | 'right';
};

const HOSTED_LOCALIZATION = {
  'inbox.filters.labels.default': 'Inbox',
  'inbox.filters.labels.unread': 'Unread',
  'inbox.filters.labels.archived': 'Archived',
  'preferences.title': 'Preferences',
  'notifications.emptyNotice': 'No notifications',
};

const TEST_LOCALIZATION = {
  'inbox.filters.labels.default': 'Inbox (Test)',
  'inbox.filters.labels.unread': 'Unread (Test)',
  'inbox.filters.labels.archived': 'Archived (Test)',
  'preferences.title': 'Preferences (Test)',
  'notifications.emptyNotice': 'This is a test inbox. Send a notification to preview it in real-time.',
};

function useInboxSubscriber() {
  const { user } = useUser();

  return useMemo(
    () =>
      user?.externalId
        ? {
            subscriberId: user.externalId,
            email: user.primaryEmailAddress?.emailAddress ?? user.emailAddresses?.[0]?.emailAddress ?? '',
            firstName: user.firstName ?? '',
            lastName: user.lastName ?? '',
          }
        : undefined,
    [user?.externalId, user?.primaryEmailAddress?.emailAddress, user?.emailAddresses, user?.firstName, user?.lastName]
  );
}

/**
 * The dashboard's own Inbox, served by Novu's production account with the shared APP_ID and the
 * `<userId>` subscriber. If that production integration has HMAC enabled, the session must carry a
 * server-minted subscriberHash (+ tenant context/contextHash), so we mint it the same way the
 * NovuCopilot connect flow does.
 */
function HostedInboxButton({ align, side }: InboxButtonProps) {
  const subscriber = useInboxSubscriber();
  const navigate = useNavigate();
  const { currentEnvironment } = useEnvironment();
  const { currentOrganization } = useAuth();
  const isNovuCopilotSlackEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_NOVU_COPILOT_SLACK_ENABLED, false);

  const isNovuProductionDashboard = window.location.hostname.includes('dashboard.novu.co');
  const isNovuStagingEnvironment = apiHostnameManager.getHostname() === 'https://api.novu-staging.co';
  const shouldUseProductionApi = isNovuProductionDashboard || isNovuStagingEnvironment;

  const { data: connectContext } = useQuery({
    queryKey: ['novu-context', currentEnvironment?._id, subscriber?.subscriberId],
    queryFn: ({ signal }) => {
      if (!currentEnvironment) {
        throw new Error('No environment selected');
      }

      return getNovuInboxContext(currentEnvironment, signal);
    },
    enabled:
      isNovuCopilotSlackEnabled &&
      !IS_SELF_HOSTED &&
      !!currentEnvironment?._id &&
      !!currentOrganization?._id &&
      !!subscriber,
    staleTime: 5 * 60 * 1000,
  });

  if (IS_SELF_HOSTED || !subscriber || !currentEnvironment || !currentOrganization) {
    return null;
  }

  return (
    <Inbox
      subscriber={subscriber}
      applicationIdentifier={APP_ID}
      backendUrl={shouldUseProductionApi ? 'https://api.novu.co' : apiHostnameManager.getHostname()}
      socketUrl={shouldUseProductionApi ? 'https://ws.novu.co' : apiHostnameManager.getWebSocketHostname()}
      socketOptions={shouldUseProductionApi ? undefined : SOCKET_OPTIONS}
      subscriberHash={connectContext?.subscriberHash}
      context={connectContext?.context}
      contextHash={connectContext?.contextHash}
      localization={HOSTED_LOCALIZATION}
      routerPush={(path: string) => navigate(path)}
    >
      <InboxInner align={align} side={side} />
    </Inbox>
  );
}

/** The workflow editor's test Inbox, opened in the customer's own environment. */
function TestInboxButton({ align, side }: InboxButtonProps) {
  const subscriber = useInboxSubscriber();
  const navigate = useNavigate();
  const { currentEnvironment } = useEnvironment();
  const { currentOrganization } = useAuth();
  const { subscriberHash, isSettled: isHashSettled } = useDashboardInboxHashes();

  if (!subscriber || !currentEnvironment || !currentOrganization || !isHashSettled) {
    return null;
  }

  return (
    <Inbox
      subscriber={subscriber}
      applicationIdentifier={currentEnvironment.identifier}
      backendUrl={apiHostnameManager.getHostname()}
      socketUrl={apiHostnameManager.getWebSocketHostname()}
      socketOptions={SOCKET_OPTIONS}
      subscriberHash={subscriberHash}
      localization={TEST_LOCALIZATION}
      routerPush={(path: string) => navigate(path)}
    >
      <InboxInner align={align} side={side} />
    </Inbox>
  );
}

export const InboxButton = (props: InboxButtonProps) => {
  const { isWorkflowEditorPage } = useWorkflowEditorPage();

  return isWorkflowEditorPage ? <TestInboxButton {...props} /> : <HostedInboxButton {...props} />;
};
