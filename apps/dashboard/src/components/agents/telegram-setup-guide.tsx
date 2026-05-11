import { ChatProviderIdEnum } from '@novu/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RiKey2Line, RiQrCodeLine, RiRobot2Line, RiSendPlaneLine } from 'react-icons/ri';
import QRCode from 'react-qr-code';
import type { AgentResponse } from '@/api/agents';
import { configureTelegramAgentWebhook, getAgentIntegrationsQueryKey } from '@/api/agents';
import { InlineToast } from '@/components/primitives/inline-toast';
import { Popover, PopoverArrow, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { cn } from '@/utils/ui';
import { IntegrationCredentialsSidebar, ListeningStatus, SetupButton, SetupStep } from './setup-guide-primitives';
import { deriveStepStatus, hasIntegrationCredentials } from './setup-guide-step-utils';

type TelegramQrPopoverProps = {
  url: string;
  username?: string;
  label: string;
};

function TelegramQrPopover({ url, username, label }: TelegramQrPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-text-sub border-stroke-soft hover:bg-bg-weak inline-flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors"
        >
          <RiQrCodeLine className="size-3.5 shrink-0" />
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent className="flex w-auto min-w-0 flex-col items-center gap-3 p-4" side="top" align="start">
        <PopoverArrow />
        <div className="rounded-lg bg-white p-2">
          <QRCode value={url} size={160} />
        </div>
        <p className="text-text-sub text-label-xs text-center leading-4">
          {username ? (
            <>
              Scan to open{' '}
              <span className="text-text-strong font-medium">@{username}</span>{' '}
              in Telegram
            </>
          ) : (
            'Scan with your phone to open in Telegram'
          )}
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-text-sub text-label-xs underline underline-offset-2"
        >
          Open in Telegram
        </a>
      </PopoverContent>
    </Popover>
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

  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset when the watched integration changes
  useEffect(() => {
    setIsConnected(false);
    setCredentialsSavedLocally(false);
    setConfiguredWebhookUrl(null);
    setBotUsername(null);
  }, [integrationId]);

  const handleConnected = useCallback(() => {
    setIsConnected(true);
    onStepsCompleted?.();
  }, [onStepsCompleted]);

  const { integrations } = useFetchIntegrations();

  const selectedIntegration = useMemo(
    () => integrations?.find((i) => i._id === integrationId && i.providerId === ChatProviderIdEnum.Telegram),
    [integrations, integrationId]
  );

  const hasCredentials = hasIntegrationCredentials(selectedIntegration?.credentials);
  const isCredentialsSaved = hasCredentials || credentialsSavedLocally;

  const { mutate: configureTelegram, isPending: isConfiguring, error: configureError } = useMutation({
    mutationFn: () =>
      configureTelegramAgentWebhook(
        requireEnvironment(currentEnvironment, 'No environment selected'),
        agent.identifier,
        integrationId
      ),
    onSuccess: (result) => {
      setConfiguredWebhookUrl(result.webhookUrl);
      setBotUsername(result.botUsername ?? null);
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

  // When credentials already exist (e.g. user revisiting the guide), auto-configure the webhook
  // so botUsername is populated and the QR code is available for step 3.
  // biome-ignore lint/correctness/useExhaustiveDependencies: run once when credentials become available
  useEffect(() => {
    if (hasCredentials && !isWebhookConfigured && !isConfiguring) {
      configureTelegram();
    }
  }, [hasCredentials]);

  const base = stepOffset;

  const firstIncompleteStep = useMemo(() => {
    if (isConnected) return base + 3;
    if (isWebhookConfigured || isCredentialsSaved) return base + 2;

    return base;
  }, [base, isCredentialsSaved, isWebhookConfigured, isConnected]);

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
        status={deriveStepStatus(base, firstIncompleteStep)}
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
          <div className="flex flex-wrap items-center gap-2">
            <SetupButton
              href="https://t.me/botfather"
              leadingIcon={<RiRobot2Line className="size-3.5" />}
            >
              Open BotFather
            </SetupButton>
            <TelegramQrPopover
              url="https://t.me/botfather"
              label="Scan QR"
            />
          </div>
        }
      />

      <SetupStep
        index={base + 1}
        status={deriveStepStatus(base + 1, firstIncompleteStep)}
        title="Save the Bot Token in Novu"
        description="Open the credentials form and paste the full BotFather confirmation message — the token is extracted and the webhook is registered automatically."
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
          <SetupButton
            leadingIcon={<RiKey2Line className="size-3.5" />}
            onClick={() => setIsCredentialsSidebarOpen(true)}
          >
            Configure credentials
          </SetupButton>
        }
      />

      <SetupStep
        index={base + 2}
        status={deriveStepStatus(base + 2, firstIncompleteStep)}
        title="Send a test message"
        description={
          <span>
            {'Open Telegram and send a direct message to your bot. If everything is configured correctly, your agent will respond. You can search for your bot by its username.'}
          </span>
        }
        rightContent={
          botUsername ? (
            <div className="flex flex-wrap items-center gap-2">
              <SetupButton
                href={`https://t.me/${botUsername}`}
                leadingIcon={<RiSendPlaneLine className="size-3.5" />}
              >
                Open @{botUsername}
              </SetupButton>
              <TelegramQrPopover
                url={`https://t.me/${botUsername}`}
                username={botUsername}
                label="Scan QR"
              />
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
          onSaveSuccess={(meta) => {
            setCredentialsSavedLocally(true);
            if (meta?.botUsername) setBotUsername(meta.botUsername);
            configureTelegram();
          }}
          agentOnboarding
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
        onSaveSuccess={(meta) => {
          setCredentialsSavedLocally(true);
          if (meta?.botUsername) setBotUsername(meta.botUsername);
          configureTelegram();
        }}
        agentOnboarding
        submitLabel="Save & Connect"
      />
    </>
  );
}
