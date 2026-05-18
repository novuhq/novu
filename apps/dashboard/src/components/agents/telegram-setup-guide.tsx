import { useUser } from '@clerk/clerk-react';
import { ChatProviderIdEnum } from '@novu/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiKey2Line, RiRobot2Line, RiSendPlaneLine } from 'react-icons/ri';
import QRCode from 'react-qr-code';
import type { AgentResponse, TelegramSubscriberLink } from '@/api/agents';
import {
  configureTelegramAgentWebhook,
  getAgentIntegrationsQueryKey,
  requestTelegramSubscriberLink,
} from '@/api/agents';
import { InlineToast } from '@/components/primitives/inline-toast';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { cn } from '@/utils/ui';
import { IntegrationCredentialsSidebar, ListeningStatus, SetupButton, SetupStep } from './setup-guide-primitives';
import { deriveStepStatus, hasIntegrationCredentials } from './setup-guide-step-utils';

type TelegramQrInlineProps = {
  url: string;
  username?: string;
};

function TelegramQrInline({ url, username }: TelegramQrInlineProps) {
  return (
    <div className="border-stroke-soft mt-2 flex w-fit flex-col items-center gap-2 rounded-md border p-3">
      <div className="rounded bg-white p-2">
        <QRCode value={url} size={140} />
      </div>
      <p className="text-text-sub text-label-xs text-center leading-4">
        {username ? (
          <>
            Scan to open <span className="text-text-strong font-medium">@{username}</span> in Telegram
          </>
        ) : (
          'Scan with your phone to open in Telegram'
        )}
      </p>
    </div>
  );
}

export type TelegramSetupGuideProps = {
  agent: AgentResponse;
  integrationId: string;
  stepOffset?: number;
  onStepsCompleted?: () => void;
  embedded?: boolean;
};


export function TelegramSetupGuide({
  agent,
  integrationId,
  stepOffset = 1,
  onStepsCompleted,
  embedded = false,
}: TelegramSetupGuideProps) {
  const [isCredentialsSidebarOpen, setIsCredentialsSidebarOpen] = useState(false);
  const [credentialsSavedLocally, setCredentialsSavedLocally] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [configuredWebhookUrl, setConfiguredWebhookUrl] = useState<string | null>(null);
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [subscriberLink, setSubscriberLink] = useState<TelegramSubscriberLink | null>(null);

  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();
  const { user } = useUser();

  // Build a stable per-agent subscriber id from the dashboard user so the test
  // step can reach the same Novu subscriber row each time setup is revisited.
  // Mirrors the Slack guide's `${user.externalId}:agent-quickstart:${agent._id}` pattern.
  const testSubscriberId = useMemo(() => {
    if (!user?.externalId) return null;

    return `${user.externalId}:agent-quickstart:${agent._id}`;
  }, [user?.externalId, agent._id]);

  // Guards the auto-configure effect below from looping on failure. Without it,
  // a failed configureTelegram() (e.g. Telegram setWebhook rate-limit) would
  // leave isWebhookConfigured=false and isConfiguring=false, and the effect
  // would immediately re-fire — generating an unbounded burst of webhook
  // registration attempts and getting rate-limited further by Telegram.
  const autoConfigureAttemptedRef = useRef(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset when the watched integration changes
  useEffect(() => {
    setIsConnected(false);
    setCredentialsSavedLocally(false);
    setConfiguredWebhookUrl(null);
    setBotUsername(null);
    autoConfigureAttemptedRef.current = false;
    setSubscriberLink(null);
  }, [integrationId]);

  const handleConnected = useCallback(() => {
    setIsConnected(true);
    onStepsCompleted?.();
  }, [onStepsCompleted]);

  const [shouldPollForMobileSubmit, setShouldPollForMobileSubmit] = useState(false);
  const { integrations } = useFetchIntegrations({
    refetchInterval: shouldPollForMobileSubmit ? 3000 : undefined,
  });

  const selectedIntegration = useMemo(
    () => integrations?.find((i) => i._id === integrationId && i.providerId === ChatProviderIdEnum.Telegram),
    [integrations, integrationId]
  );

  const hasCredentials = hasIntegrationCredentials(selectedIntegration?.credentials);
  const isCredentialsSaved = hasCredentials || credentialsSavedLocally;
  // Set only after a successful setWebhook call; prevents the dashboard from
  // re-registering a webhook the mobile flow already configured.
  const hasWebhookSecret =
    typeof selectedIntegration?.credentials?.token === 'string' &&
    selectedIntegration.credentials.token.length > 0;
  // Poll for credentials only while the sidebar is open AND the user hasn't saved a token yet.
  // Stops the moment the drawer closes or credentials appear.
  useEffect(() => {
    setShouldPollForMobileSubmit(isCredentialsSidebarOpen && !hasCredentials);
  }, [isCredentialsSidebarOpen, hasCredentials]);

  // Tracks whether the credentials drawer was opened while no token was set on the integration.
  // Only then should we auto-close on the false to true credentials flip; this prevents the drawer
  // from snapping shut when reopened to view already-saved credentials.
  const wasMissingOnOpenRef = useRef(false);

  useEffect(() => {
    if (isCredentialsSidebarOpen && !hasCredentials) {
      wasMissingOnOpenRef.current = true;
    } else if (!isCredentialsSidebarOpen) {
      wasMissingOnOpenRef.current = false;
    }
  }, [isCredentialsSidebarOpen, hasCredentials]);

  useEffect(() => {
    if (isCredentialsSidebarOpen && hasCredentials && wasMissingOnOpenRef.current) {
      wasMissingOnOpenRef.current = false;
      setIsCredentialsSidebarOpen(false);
      setCredentialsSavedLocally(true);
      showSuccessToast('Bot token saved from your phone');
    }
  }, [hasCredentials, isCredentialsSidebarOpen]);

  const { mutate: configureTelegram, isPending: isConfiguring, error: configureError } = useMutation({
    mutationFn: () =>
      configureTelegramAgentWebhook(
        requireEnvironment(currentEnvironment, 'No environment selected'),
        agent.identifier,
        integrationId
      ),
    onSuccess: (result) => {
      setConfiguredWebhookUrl(result.webhookUrl);
      setBotUsername(result.botUsername);
      queryClient.invalidateQueries({
        queryKey: getAgentIntegrationsQueryKey(currentEnvironment?._id, agent.identifier),
      });
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : 'Failed to configure webhook. Check your Bot Token and try again.';
      showErrorToast(message);
    },
  });

  const isWebhookConfigured = Boolean(configuredWebhookUrl);

  // Every code path that fires the webhook configuration goes through this
  // helper so the auto-configure effect cannot also fire after a manual
  // attempt fails. See autoConfigureAttemptedRef above for the rate-limit
  // loop this prevents.
  const runConfigureTelegram = useCallback(() => {
    autoConfigureAttemptedRef.current = true;
    configureTelegram();
  }, [configureTelegram]);

  // Auto-configure only when a Bot Token exists but no webhook secret yet.
  useEffect(() => {
    if (
      hasCredentials &&
      !hasWebhookSecret &&
      !isWebhookConfigured &&
      !isConfiguring &&
      !autoConfigureAttemptedRef.current
    ) {
      runConfigureTelegram();
    }
  }, [hasCredentials, hasWebhookSecret, isWebhookConfigured, isConfiguring, runConfigureTelegram]);

  const {
    mutate: issueSubscriberLink,
    isPending: isIssuingSubscriberLink,
    error: subscriberLinkError,
  } = useMutation({
    mutationFn: () => {
      if (!testSubscriberId) {
        throw new Error('Sign-in is required to issue a Telegram connection link.');
      }

      return requestTelegramSubscriberLink(
        requireEnvironment(currentEnvironment, 'No environment selected'),
        agent.identifier,
        integrationId,
        testSubscriberId
      );
    },
    onSuccess: (result) => {
      setSubscriberLink(result);
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to issue a Telegram connection link. Check that the bot token is valid and try again.';
      showErrorToast(message);
    },
  });

  // Once the webhook is registered, auto-issue a subscriber-link for the
  // current dashboard user so step 3 ("Send a test message") opens a deep link
  // that automatically links this Telegram chat to a test subscriber.
  useEffect(() => {
    if (
      isWebhookConfigured &&
      botUsername &&
      testSubscriberId &&
      !subscriberLink &&
      !isIssuingSubscriberLink &&
      !subscriberLinkError
    ) {
      issueSubscriberLink();
    }
  }, [
    isWebhookConfigured,
    botUsername,
    testSubscriberId,
    subscriberLink,
    isIssuingSubscriberLink,
    subscriberLinkError,
    issueSubscriberLink,
  ]);

  const base = stepOffset;

  const firstIncompleteStep = useMemo(() => {
    if (isConnected) return base + 3;
    if (isWebhookConfigured || isCredentialsSaved) return base + 2;

    return base;
  }, [base, isCredentialsSaved, isWebhookConfigured, isConnected]);

  const step1Status = deriveStepStatus(base, firstIncompleteStep);
  const step3Status = deriveStepStatus(base + 2, firstIncompleteStep);

  const configureErrorMessage = useMemo(() => {
    if (!configureError) return null;

    return configureError instanceof Error
      ? configureError.message
      : 'Failed to configure webhook. Please try again.';
  }, [configureError]);

  const stepsColumn = (
    <>
      <SetupStep
        index={base}
        status={step1Status}
        title="Create a bot with BotFather"
        description={
          <span>
            {'Open '}
            <a
              href="https://t.me/botfather"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-sub underline"
            >
              @BotFather
            </a>
            {' on Telegram and run '}
            <code className="text-text-sub rounded bg-neutral-alpha-100 px-1 font-mono text-[11px]">/newbot</code>
            {'. Follow the prompts to choose a name and username, then copy the entire confirmation message BotFather sends.'}
          </span>
        }
        rightContent={
          <div className="flex flex-col items-start gap-0">
            <SetupButton
              href="https://t.me/botfather"
              leadingIcon={<RiRobot2Line className="size-3.5" />}
            >
              Open BotFather
            </SetupButton>
            {step1Status === 'current' && <TelegramQrInline url="https://t.me/botfather" />}
          </div>
        }
      />

      <SetupStep
        index={base + 1}
        status={deriveStepStatus(base + 1, firstIncompleteStep)}
        title="Save the Bot Token in Novu"
        description="Open the credentials form to paste the full BotFather confirmation message — or scan the QR code inside the form to finish setup from the phone where BotFather sent the token."
        extraContent={
          <>
            {configureErrorMessage && (
              <InlineToast
                className="mt-2 w-full"
                variant="error"
                title="Webhook registration failed"
                description={configureErrorMessage}
              />
            )}
          </>
        }
        rightContent={
          <div className="flex flex-col items-start gap-0">
            <SetupButton
              leadingIcon={<RiKey2Line className="size-3.5" />}
              onClick={() => setIsCredentialsSidebarOpen(true)}
            >
              Configure credentials
            </SetupButton>
          </div>
        }
      />

      <SetupStep
        index={base + 2}
        status={step3Status}
        title="Send a test message"
        description={
          <span>
            {subscriberLink
              ? 'Open the connection link below in Telegram. The bot will link this chat to a test subscriber and confirm your agent can reach you here.'
              : 'Open Telegram and send a direct message to your bot. If everything is configured correctly, your agent will respond. You can search for your bot by its username.'}
          </span>
        }
        rightContent={
          botUsername ? (
            <div className="flex flex-col items-start gap-0">
              <SetupButton
                href={subscriberLink?.deepLinkUrl ?? `https://t.me/${botUsername}`}
                leadingIcon={<RiSendPlaneLine className="size-3.5" />}
              >
                {subscriberLink ? `Connect & test @${botUsername}` : `Open @${botUsername}`}
              </SetupButton>
              {step3Status === 'current' && (
                <TelegramQrInline
                  url={subscriberLink?.deepLinkUrl ?? `https://t.me/${botUsername}`}
                  username={botUsername}
                />
              )}
            </div>
          ) : null
        }
      />
    </>
  );

  const listening = (
    <ListeningStatus
      agentIdentifier={agent.identifier}
      watchedIntegrationId={integrationId}
      onConnected={handleConnected}
      connectedMessage="Telegram is connected — your agent is ready to receive messages."
      listeningMessage="Waiting for a message to your bot to confirm the webhook is working…"
    />
  );

  if (embedded) {
    return (
      <div className="flex flex-col gap-0">
        <div className={cn('relative flex flex-col gap-10 py-6 pb-3 pl-8 pr-6')}>
          <div
            className="absolute bottom-0 left-[22px] top-0 w-px"
            style={{
              background: 'linear-gradient(to bottom, transparent 0%, #E1E4EA 10%, #E1E4EA 90%, transparent 100%)',
            }}
          />
          {stepsColumn}
        </div>
        {listening}
        <IntegrationCredentialsSidebar
          integrationId={integrationId}
          isOpen={isCredentialsSidebarOpen}
          onClose={() => setIsCredentialsSidebarOpen(false)}
          onSaveSuccess={() => {
            setCredentialsSavedLocally(true);
            runConfigureTelegram();
          }}
          agentOnboarding
          agentIdentifier={agent.identifier}
          submitLabel="Save & Connect"
        />
      </div>
    );
  }

  return (
    <>
      {stepsColumn}
      {listening}
      <IntegrationCredentialsSidebar
        integrationId={integrationId}
        isOpen={isCredentialsSidebarOpen}
        onClose={() => setIsCredentialsSidebarOpen(false)}
        onSaveSuccess={() => {
          setCredentialsSavedLocally(true);
          runConfigureTelegram();
        }}
        agentOnboarding
        agentIdentifier={agent.identifier}
        submitLabel="Save & Connect"
      />
    </>
  );
}
