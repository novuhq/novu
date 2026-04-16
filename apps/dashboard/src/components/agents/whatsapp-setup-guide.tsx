import { ChatProviderIdEnum } from '@novu/shared';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactConfetti from 'react-confetti';
import { createPortal } from 'react-dom';
import { RiArrowRightUpLine, RiKey2Line } from 'react-icons/ri';
import { type AgentResponse, getAgentIntegrationsQueryKey, listAgentIntegrations } from '@/api/agents';
import { ProviderIcon } from '@/components/integrations/components/provider-icon';
import { CopyButton } from '@/components/primitives/copy-button';
import { InlineToast } from '@/components/primitives/inline-toast';
import { ExternalLink } from '@/components/shared/external-link';
import { API_HOSTNAME } from '@/config';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { cn } from '@/utils/ui';
import { IntegrationCredentialsSidebar, SetupButton, SetupStep } from './setup-guide-primitives';
import { deriveStepStatus } from './setup-guide-step-utils';

export type WhatsAppSetupGuideProps = {
  agent: AgentResponse;
  integrationId: string;
  stepOffset?: number;
  onStepsCompleted?: () => void;
  embedded?: boolean;
};

function ListeningStatus({
  agentIdentifier,
  watchedIntegrationId,
  onConnected,
}: {
  agentIdentifier: string;
  watchedIntegrationId: string | undefined;
  onConnected?: () => void;
}) {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();
  const [connectedAt, setConnectedAt] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!currentEnvironment || !watchedIntegrationId) {
      return;
    }

    const environment = currentEnvironment;
    let cancelled = false;
    let confettiFired = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function tick() {
      if (cancelled) {
        return;
      }

      try {
        const res = await listAgentIntegrations({
          environment,
          agentIdentifier,
          limit: 100,
        });

        if (cancelled) {
          return;
        }

        const link = res.data.find((l) => l.integration._id === watchedIntegrationId);

        if (!link) {
          return;
        }

        if (!link.connectedAt) {
          return;
        }

        setConnectedAt(link.connectedAt);

        if (!confettiFired) {
          confettiFired = true;
          setShowConfetti(true);

          if (confettiTimeoutRef.current) {
            clearTimeout(confettiTimeoutRef.current);
          }

          confettiTimeoutRef.current = window.setTimeout(() => {
            confettiTimeoutRef.current = null;
            setShowConfetti(false);
          }, 10_000);
          onConnected?.();
        }

        queryClient.invalidateQueries({
          queryKey: getAgentIntegrationsQueryKey(environment._id, agentIdentifier),
        });

        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      } catch {
        // ignore transient errors while polling
      }
    }

    void tick();
    intervalId = setInterval(() => void tick(), 1000);

    return () => {
      cancelled = true;

      if (intervalId) {
        clearInterval(intervalId);
      }

      if (confettiTimeoutRef.current) {
        clearTimeout(confettiTimeoutRef.current);
        confettiTimeoutRef.current = null;
      }
    };
  }, [agentIdentifier, currentEnvironment, onConnected, queryClient, watchedIntegrationId]);

  return (
    <>
      {showConfetti &&
        createPortal(
          <ReactConfetti
            width={window.innerWidth}
            height={window.innerHeight}
            recycle={false}
            numberOfPieces={1000}
            style={{
              position: 'fixed',
              inset: 0,
              pointerEvents: 'none',
              zIndex: 10000,
            }}
          />,
          document.body
        )}
      <div className="flex flex-col gap-2 py-4 pl-8">
        <div className="flex flex-col gap-3">
          {connectedAt ? (
            <div className="flex items-center gap-1">
              <CheckCircle2 className="text-success-base size-3.5 shrink-0" />
              <span className="text-text-strong text-label-sm font-medium">Connected</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Loader className="size-3.5 text-[#dd2476] animate-[spin_5s_linear_infinite]" />
              <span className="animate-gradient bg-linear-to-r from-[#dd2476] via-[#ff512f] to-[#dd2476] bg-size-[400%_400%] bg-clip-text text-label-sm font-medium text-transparent">
                Listening...
              </span>
            </div>
          )}
          <p className="text-text-soft text-label-xs font-medium leading-4">
            {connectedAt
              ? 'Your WhatsApp Business account is connected. This agent is ready to receive messages.'
              : 'Send a WhatsApp message to your business number to verify configuration.'}
          </p>
        </div>
        <ExternalLink href="https://docs.novu.co/agents/overview" variant="documentation">
          Learn more in docs
        </ExternalLink>
      </div>
    </>
  );
}

function getApiBaseUrl(): string {
  return (API_HOSTNAME ?? 'https://api.novu.co').replace(/\/$/, '');
}

function buildAgentWebhookUrl(agentId: string, integrationIdentifier: string): string {
  return `${getApiBaseUrl()}/v1/agents/${agentId}/webhook/${integrationIdentifier}`;
}

function WebhookUrlSection({ webhookUrl }: { webhookUrl: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-text-sub text-label-xs font-medium leading-5">Webhook URL</p>
      <div className="border-stroke-soft bg-bg-white flex h-7 items-center overflow-hidden rounded-md border shadow-xs">
        <input
          type="text"
          readOnly
          value={webhookUrl}
          aria-label="Webhook URL"
          className="text-text-soft min-w-0 flex-1 truncate bg-transparent px-2 font-mono text-[12px] leading-4 outline-none"
        />
        <CopyButton valueToCopy={webhookUrl} size="xs" className="shrink-0 border-l border-stroke-soft" />
      </div>
    </div>
  );
}

export function WhatsAppSetupGuide({
  agent,
  integrationId,
  stepOffset = 1,
  onStepsCompleted,
  embedded = false,
}: WhatsAppSetupGuideProps) {
  const [isCredentialsSidebarOpen, setIsCredentialsSidebarOpen] = useState(false);
  const [isCredentialsSaved, setIsCredentialsSaved] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset when the watched integration changes
  useEffect(() => {
    setIsConnected(false);
  }, [integrationId]);

  const handleConnected = useCallback(() => {
    setIsConnected(true);
    onStepsCompleted?.();
  }, [onStepsCompleted]);

  const { integrations } = useFetchIntegrations();

  const selectedIntegrationIdentifier = useMemo(() => {
    const row = integrations?.find(
      (i) => i._id === integrationId && i.providerId === ChatProviderIdEnum.WhatsAppBusiness
    );

    return row?.identifier ?? '';
  }, [integrations, integrationId]);

  const webhookUrl = buildAgentWebhookUrl(
    agent._id,
    selectedIntegrationIdentifier || 'YOUR_INTEGRATION_IDENTIFIER'
  );

  const base = stepOffset;

  const firstIncompleteStep = useMemo(() => {
    if (isConnected) {
      return base + 3;
    }

    if (!isCredentialsSaved) {
      return base;
    }

    return base + 2;
  }, [base, isCredentialsSaved, isConnected]);

  const stepsColumn = (
    <>
      <SetupStep
        index={base}
        status={deriveStepStatus(base, firstIncompleteStep)}
        title="Configure WhatsApp credentials"
        description={
          <span>
            {'Paste the Access Token, Phone Number ID, App Secret and Verify Token from your '}
            <a
              href="https://developers.facebook.com/apps/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-sub underline"
            >
              Meta Developer portal
            </a>
            {' into the integration.'}
          </span>
        }
        rightContent={
          <div className="flex flex-col gap-3">
            <SetupButton
              leadingIcon={<RiKey2Line className="size-3.5" />}
              onClick={() => setIsCredentialsSidebarOpen(true)}
            >
              Configure credentials
            </SetupButton>
            <a
              href="https://developers.facebook.com/apps/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-1"
            >
              <ProviderIcon
                providerId={ChatProviderIdEnum.WhatsAppBusiness}
                providerDisplayName="WhatsApp Business"
                className="size-4 shrink-0"
              />
              <span className="text-text-sub text-label-xs font-medium">Meta Developer Portal</span>
              <RiArrowRightUpLine className="text-text-sub size-3" />
            </a>
          </div>
        }
      />

      <SetupStep
        index={base + 1}
        status={deriveStepStatus(base + 1, firstIncompleteStep)}
        title="Set the webhook URL in Meta"
        description="In your Meta app's WhatsApp configuration, paste this webhook URL and set the Verify Token to the same value you entered in the credentials step."
        extraContent={
          <InlineToast
            className="mt-2 w-full"
            variant="tip"
            title="Tip:"
            description="Subscribe to the 'messages' webhook field so your agent receives inbound messages."
          />
        }
        rightContent={<WebhookUrlSection webhookUrl={webhookUrl} />}
      />

      <SetupStep
        index={base + 2}
        status={deriveStepStatus(base + 2, firstIncompleteStep)}
        title="Verify by sending a message"
        description="Send a WhatsApp message to your business phone number to confirm the webhook is connected and the agent responds."
      />
    </>
  );

  const listening = (
    <ListeningStatus
      agentIdentifier={agent.identifier}
      watchedIntegrationId={integrationId}
      onConnected={handleConnected}
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
          onSaveSuccess={() => setIsCredentialsSaved(true)}
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
        onSaveSuccess={() => setIsCredentialsSaved(true)}
      />
    </>
  );
}
