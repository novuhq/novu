import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useState } from 'react';
import { RiCloseLine } from 'react-icons/ri';
import { useCopilotConnectContext } from '@/components/connect/copilot-connect-context';
import { CopilotConnectProvider } from '@/components/connect/copilot-connect-provider';
import { useCopilotSlackConnection } from '@/components/connect/use-copilot-slack-connection';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { NOVU_COPILOT_SLACK_INTEGRATION_IDENTIFIER } from '@/config';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { cn } from '@/utils/ui';

const DEVELOPMENT_ENVIRONMENT_NAME = 'Development';
const slackIcon = '/images/providers/light/square/slack.svg';

function getDismissStorageKey(organizationId: string): string {
  return `novu-copilot-slack-banner-dismissed:${organizationId}`;
}

/**
 * Dismissible "Connect Slack" prompt shown above the workflow-editor copilot input, inviting the
 * org to connect the Novu-hosted NovuCopilot Slack agent. Rendered only when the flag is on, the
 * hosted Slack integration is configured, the environment is Development, the workspace is not yet
 * connected, and the user hasn't dismissed it. Dismissal persists per organization.
 */
export function CopilotSlackConnectBanner() {
  const isEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_NOVU_COPILOT_SLACK_ENABLED, false);
  const { currentUser, currentOrganization } = useAuth();
  const { currentEnvironment } = useEnvironment();

  const isDevelopmentEnvironment = currentEnvironment?.name === DEVELOPMENT_ENVIRONMENT_NAME;

  const isConfigured =
    !!NOVU_COPILOT_SLACK_INTEGRATION_IDENTIFIER &&
    !!currentOrganization?._id &&
    !!currentEnvironment?._id &&
    !!currentUser?._id;

  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    if (!currentOrganization?._id || typeof window === 'undefined') {
      return false;
    }

    return window.localStorage.getItem(getDismissStorageKey(currentOrganization._id)) === 'true';
  });

  if (!isEnabled || !isConfigured || !isDevelopmentEnvironment || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    if (currentOrganization?._id && typeof window !== 'undefined') {
      window.localStorage.setItem(getDismissStorageKey(currentOrganization._id), 'true');
    }

    setIsDismissed(true);
  };

  return (
    <CopilotConnectProvider>
      <CopilotSlackConnectBannerInner organizationId={currentOrganization._id} onDismiss={handleDismiss} />
    </CopilotConnectProvider>
  );
}

type CopilotSlackConnectBannerInnerProps = {
  organizationId: string;
  onDismiss: () => void;
};

function CopilotSlackConnectBannerInner({ organizationId, onDismiss }: CopilotSlackConnectBannerInnerProps) {
  const connectContext = useCopilotConnectContext();
  const { isWorkspaceConnected, isConnecting, connectWorkspace } = useCopilotSlackConnection({
    organizationId,
    onError: (error) => {
      showErrorToast('Failed to connect to Slack. Please try again.');
      console.error(error);
    },
  });

  if (!connectContext || isWorkspaceConnected) {
    return null;
  }

  return (
    <div
      className={cn(
        'bg-bg-weak border-stroke-soft shadow-xs -mb-px flex max-h-[150px] flex-col items-start gap-2',
        'overflow-y-auto rounded-t-lg border-l border-r border-t px-2 py-2 mx-2'
      )}
    >
      <div className="flex w-full items-center gap-1">
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <span className="text-text-sub text-label-xs font-medium leading-4">Ask Copilot from</span>
          <span className="flex items-center gap-1">
            <img src={slackIcon} alt="" className="size-3.5 shrink-0" />
            <span className="text-text-sub text-label-xs font-medium leading-4">Slack</span>
          </span>
        </div>
        <button
          type="button"
          onClick={connectWorkspace}
          disabled={isConnecting}
          className="cursor-pointer text-text-strong text-label-xs font-medium leading-4 transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          {isConnecting ? 'Connecting…' : 'Connect Slack'}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="text-text-soft hover:text-text-sub flex size-4 shrink-0 items-center justify-center transition-colors"
        >
          <RiCloseLine className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
