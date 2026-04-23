import { ChatProviderIdEnum } from '@novu/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RiArrowRightUpLine, RiKey2Line } from 'react-icons/ri';
import type { AgentResponse } from '@/api/agents';
import { ProviderIcon } from '@/components/integrations/components/provider-icon';
import { CopyButton } from '@/components/primitives/copy-button';
import { InlineToast } from '@/components/primitives/inline-toast';
import { API_HOSTNAME } from '@/config';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { cn } from '@/utils/ui';
import { IntegrationCredentialsSidebar, ListeningStatus, SetupButton, SetupStep } from './setup-guide-primitives';
import { deriveStepStatus } from './setup-guide-step-utils';

export type WhatsAppSetupGuideProps = {
  agent: AgentResponse;
  integrationId: string;
  stepOffset?: number;
  onStepsCompleted?: () => void;
  embedded?: boolean;
};

function getApiBaseUrl(): string {
  return (API_HOSTNAME ?? 'https://api.novu.co').replace(/\/$/, '');
}

function buildAgentWebhookUrl(agentId: string, integrationIdentifier: string): string {
  return `${getApiBaseUrl()}/v1/agents/${agentId}/webhook/${integrationIdentifier}`;
}

function WebhookUrlSection({ webhookUrl }: { webhookUrl: string }) {
  return (
    <div className="flex w-full max-w-[320px] flex-col gap-1.5">
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

  const webhookUrl = buildAgentWebhookUrl(agent._id, selectedIntegrationIdentifier || 'YOUR_INTEGRATION_IDENTIFIER');

  const base = stepOffset;

  const firstIncompleteStep = useMemo(() => {
    if (isConnected) {
      return base + 5;
    }

    if (!isCredentialsSaved) {
      return base;
    }

    return base + 3;
  }, [base, isCredentialsSaved, isConnected]);

  const stepsColumn = (
    <>
      <SetupStep
        index={base}
        status={deriveStepStatus(base, firstIncompleteStep)}
        title="Create a Meta app"
        description={
          <span>
            {'Open the '}
            <a
              href="https://developers.facebook.com/apps/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-sub underline"
            >
              Meta App Dashboard
            </a>
            {' and click '}
            <strong className="text-text-sub">Create App</strong>
            {'. Select the '}
            <strong className="text-text-sub">Connect with customers through WhatsApp</strong>
            {' use case, then pick or create a business portfolio.'}
          </span>
        }
        rightContent={
          <SetupButton
            href="https://developers.facebook.com/apps/"
            leadingIcon={
              <ProviderIcon
                providerId={ChatProviderIdEnum.WhatsAppBusiness}
                providerDisplayName="WhatsApp Business"
                className="size-4 shrink-0"
              />
            }
          >
            Meta App Dashboard
          </SetupButton>
        }
      />

      <SetupStep
        index={base + 1}
        status={deriveStepStatus(base + 1, firstIncompleteStep)}
        title="Get your API credentials"
        description={
          <span>
            {'After creating the app you land on the Quickstart page. Go to '}
            <strong className="text-text-sub">WhatsApp &gt; API Setup</strong>
            {' and collect these four values:'}
          </span>
        }
        extraContent={
          <ol className="text-text-soft text-label-xs mt-1.5 list-inside list-decimal space-y-0.5 font-medium leading-4">
            <li>
              <strong className="text-text-sub">Access Token</strong> — click &quot;Generate access token&quot; on the
              API Setup page
            </li>
            <li>
              <strong className="text-text-sub">Phone Number ID</strong> — shown under your selected phone number on the
              API Setup page
            </li>
            <li>
              <strong className="text-text-sub">App Secret</strong> — found under App Settings &gt; Basic
            </li>
            <li>
              <strong className="text-text-sub">Verify Token</strong> — choose any secret string (you will reuse it when
              configuring the webhook)
            </li>
          </ol>
        }
      />

      <SetupStep
        index={base + 2}
        status={deriveStepStatus(base + 2, firstIncompleteStep)}
        title="Save credentials in Novu"
        description="Open the credentials form and enter the four values from the previous step."
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
        index={base + 3}
        status={deriveStepStatus(base + 3, firstIncompleteStep)}
        title="Configure the webhook"
        description={
          <span>
            {'In your Meta app, go to '}
            <strong className="text-text-sub">WhatsApp &gt; Configuration</strong>
            {'. Set the '}
            <strong className="text-text-sub">Callback URL</strong>
            {' to the webhook URL below, and enter the same '}
            <strong className="text-text-sub">Verify Token</strong>
            {' you chose earlier.'}
          </span>
        }
        extraContent={
          <InlineToast
            className="mt-2 w-full"
            variant="tip"
            title="Don't forget:"
            description="Click 'Subscribe' next to the 'messages' webhook field — without it your agent won't receive incoming messages."
          />
        }
        rightContent={<WebhookUrlSection webhookUrl={webhookUrl} />}
      />

      <SetupStep
        index={base + 4}
        status={deriveStepStatus(base + 4, firstIncompleteStep)}
        title="Send a test message"
        description="Open WhatsApp and send a message to your business phone number. If everything is configured correctly, your agent will respond."
        extraContent={
          <InlineToast
            className="mt-2 w-full"
            variant="tip"
            title="Before going live:"
            description="The token from API Setup expires after 24 hours. For production, create a permanent System User Token in Meta Business Settings > System Users."
          />
        }
      />
    </>
  );

  const listening = (
    <ListeningStatus
      agentIdentifier={agent.identifier}
      watchedIntegrationId={integrationId}
      onConnected={handleConnected}
      connectedMessage="WhatsApp is connected — your agent is ready to receive messages."
      listeningMessage="Waiting for a message on your business number to confirm the webhook is working…"
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
