import { FeatureFlagsKeysEnum } from '@novu/shared';
import { AnimatePresence, motion } from 'motion/react';
import { type ReactNode } from 'react';
import { RiCheckboxCircleFill, RiLinkUnlinkM } from 'react-icons/ri';
import { useCopilotConnectContext } from '@/components/connect/copilot-connect-context';
import { CopilotConnectProvider } from '@/components/connect/copilot-connect-provider';
import { useCopilotSlackConnection } from '@/components/connect/use-copilot-slack-connection';
import { BadgeIcon } from '@/components/primitives/badge';
import { Button } from '@/components/primitives/button';
import { Skeleton } from '@/components/primitives/skeleton';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { NOVU_COPILOT_SLACK_INTEGRATION_IDENTIFIER } from '@/config';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';

const DEVELOPMENT_ENVIRONMENT_NAME = 'Development';
const slackIcon = '/images/providers/light/square/slack.svg';

const ACTION_TRANSITION = { duration: 0.15, ease: 'easeInOut' } as const;
const ROW_TRANSITION = { duration: 0.2, ease: 'easeInOut' } as const;

function formatConnectedDate(iso?: string): string | null {
  if (!iso) {
    return null;
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

/**
 * "Connected workspaces" section for Organization settings: lets an org connect the Novu-hosted
 * NovuCopilot Slack agent (workspace-level) and, once connected, lets the current user link their
 * personal Slack account for @mentions/attribution. Gated behind the NovuCopilot Slack flag, the
 * hosted integration being configured, and the Development environment (matches the connect flow's
 * dogfooding scope).
 */
export function ConnectedWorkspacesSection() {
  const isEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_NOVU_COPILOT_SLACK_ENABLED, false);
  const { currentUser, currentOrganization } = useAuth();
  const { currentEnvironment } = useEnvironment();

  const isDevelopmentEnvironment = currentEnvironment?.name === DEVELOPMENT_ENVIRONMENT_NAME;

  const isConfigured =
    !!NOVU_COPILOT_SLACK_INTEGRATION_IDENTIFIER &&
    !!currentOrganization?._id &&
    !!currentEnvironment?._id &&
    !!currentUser?._id;

  if (!isEnabled || !isConfigured || !isDevelopmentEnvironment) {
    return null;
  }

  return (
    <div>
      <h1 className="text-label-sm text-text-strong mb-2">Connected workspaces</h1>
      <CopilotConnectProvider fallback={<ConnectedWorkspacesSkeleton />}>
        <ConnectedWorkspacesContent organizationId={currentOrganization._id} />
      </CopilotConnectProvider>
    </div>
  );
}

type ConnectedWorkspacesContentProps = {
  organizationId: string;
};

function ConnectedWorkspacesContent({ organizationId }: ConnectedWorkspacesContentProps) {
  const connectContext = useCopilotConnectContext();
  const {
    isWorkspaceConnected,
    isWorkspaceLoading,
    workspaceName,
    connectedAt,
    isUserLinked,
    isUserLinkLoading,
    isConnecting,
    isLinking,
    isDisconnecting,
    isUnlinking,
    connectWorkspace,
    linkUser,
    disconnectWorkspace,
    unlinkUser,
  } = useCopilotSlackConnection({
    organizationId,
    onError: (error) => {
      showErrorToast('Failed to connect to Slack. Please try again.');
      console.error(error);
    },
  });

  const connectedDate = formatConnectedDate(connectedAt);
  const showUserLinkRow = isWorkspaceLoading || isWorkspaceConnected;

  function renderWorkspaceAction() {
    if (isWorkspaceLoading) {
      return (
        <ActionFade key="workspace-loading">
          <Skeleton className="h-7 w-[104px]" />
        </ActionFade>
      );
    }

    if (isWorkspaceConnected) {
      return (
        <ActionFade key="workspace-connected" className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <ConnectedBadge />
            <Button
              variant="secondary"
              mode="outline"
              size="2xs"
              className="shrink-0"
              leadingIcon={RiLinkUnlinkM}
              onClick={disconnectWorkspace}
              disabled={isDisconnecting}
              isLoading={isDisconnecting}
              aria-label="Disconnect Slack workspace"
            />
          </div>
          {workspaceName && connectedDate ? (
            <span className="text-label-xs">
              <span className="text-text-sub">{workspaceName} · </span>
              <span className="text-text-soft">Enabled </span>
              <span className="text-text-sub">{connectedDate}</span>
            </span>
          ) : null}
        </ActionFade>
      );
    }

    return (
      <ActionFade key="workspace-disconnected">
        <Button
          variant="secondary"
          mode="outline"
          size="xs"
          className="shrink-0"
          onClick={connectWorkspace}
          disabled={isConnecting || !connectContext}
          isLoading={isConnecting}
        >
          <img src={slackIcon} alt="" className="size-4 shrink-0" />
          Add to Slack
        </Button>
      </ActionFade>
    );
  }

  function renderUserLinkAction() {
    if (isUserLinkLoading) {
      return (
        <ActionFade key="user-loading">
          <Skeleton className="h-7 w-[76px]" />
        </ActionFade>
      );
    }

    if (isUserLinked) {
      return (
        <ActionFade key="user-linked" className="flex items-center gap-2">
          <ConnectedBadge />
          <Button
            variant="secondary"
            mode="outline"
            size="2xs"
            className="shrink-0"
            leadingIcon={RiLinkUnlinkM}
            onClick={unlinkUser}
            disabled={isUnlinking}
            isLoading={isUnlinking}
            aria-label="Unlink your Slack account"
          />
        </ActionFade>
      );
    }

    return (
      <ActionFade key="user-unlinked">
        <Button
          variant="secondary"
          mode="outline"
          size="xs"
          className="shrink-0"
          onClick={linkUser}
          disabled={isLinking || !connectContext}
          isLoading={isLinking}
        >
          Connect
        </Button>
      </ActionFade>
    );
  }

  return (
    <div className="border-stroke-soft divide-stroke-soft divide-y overflow-hidden rounded-xl border">
      <div className="flex items-center justify-between gap-4 p-3 bg-bg-weak">
        <WorkspaceRowLabel />
        <ActionSlot>
          <AnimatePresence mode="wait" initial={false}>
            {renderWorkspaceAction()}
          </AnimatePresence>
        </ActionSlot>
      </div>

      <AnimatePresence initial={false}>
        {showUserLinkRow ? (
          <motion.div
            key="user-link-row"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={ROW_TRANSITION}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between gap-4 p-3">
              <UserLinkRowLabel />
              <ActionSlot>
                <AnimatePresence mode="wait" initial={false}>
                  {renderUserLinkAction()}
                </AnimatePresence>
              </ActionSlot>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function WorkspaceRowLabel() {
  return (
    <div className="flex flex-col min-w-0 justify-between gap-1">
      <div className="flex items-center gap-1.5">
        <img src={slackIcon} alt="" className="size-4 shrink-0" />
        <span className="text-label-sm text-text-strong font-medium leading-5">Slack workspace</span>
      </div>
      <span className="text-paragraph-xs text-text-soft leading-4">
        Create and edit workflows directly from Slack via Novu Copilot
      </span>
    </div>
  );
}

function UserLinkRowLabel() {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-label-sm text-text-strong font-medium leading-5">Link your Slack account</span>
      <span className="text-paragraph-xs text-text-soft leading-4">
        Link your profile for @mentions and message attribution
      </span>
    </div>
  );
}

function ConnectedBadge() {
  return (
    <div className="flex items-center gap-2">
      <BadgeIcon as={RiCheckboxCircleFill} variant="filled" color="green" className="size-3.5 text-success-base" />
      <span className="text-label-xs font-normal">Connected</span>
    </div>
  );
}

/**
 * Fixed-height, right-aligned container for a row's trailing action. Keeps the row height stable
 * so crossfading between the skeleton, connect button, and connected states never shifts layout.
 */
function ActionSlot({ children }: { children: ReactNode }) {
  return <div className="flex min-h-7 shrink-0 items-center justify-end">{children}</div>;
}

type ActionFadeProps = {
  children: ReactNode;
  className?: string;
};

function ActionFade({ children, className }: ActionFadeProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={ACTION_TRANSITION}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Provider-level fallback rendered while the tenant context is minted. Mirrors the connected card
 * layout (workspace row + user-link row) with skeleton actions so the swap into the live content
 * is seamless.
 */
function ConnectedWorkspacesSkeleton() {
  return (
    <div className="border-stroke-soft divide-stroke-soft divide-y overflow-hidden rounded-xl border">
      <div className="flex items-center justify-between gap-4 p-3 bg-bg-weak">
        <WorkspaceRowLabel />
        <ActionSlot>
          <Skeleton className="h-7 w-[104px]" />
        </ActionSlot>
      </div>
      <div className="flex items-center justify-between gap-4 p-3">
        <UserLinkRowLabel />
        <ActionSlot>
          <Skeleton className="h-7 w-[76px]" />
        </ActionSlot>
      </div>
    </div>
  );
}
