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
        title="Create a Meta app and get credentials"
        description={
          <span>
            {'Go to the '}
            <a
              href="https://developers.facebook.com/apps/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-sub underline"
            >
              Meta Developer Portal
            </a>
            {', click '}
            <strong className="text-text-sub">Create App</strong>
            {' and select the '}
            <strong className="text-text-sub">Business</strong>
            {
              ' type. Add the WhatsApp product to your app, then copy these values from your app dashboard into the credentials form:'
            }
          </span>
        }
        extraContent={
          <ul className="text-text-soft text-label-xs mt-1.5 list-inside list-disc space-y-0.5 font-medium leading-4">
            <li>
              <strong className="text-text-sub">Access Token</strong> — WhatsApp &gt; API Setup
            </li>
            <li>
              <strong className="text-text-sub">Phone Number ID</strong> — WhatsApp &gt; API Setup
            </li>
            <li>
              <strong className="text-text-sub">App Secret</strong> — App Settings &gt; Basic
            </li>
            <li>
              <strong className="text-text-sub">Verify Token</strong> — a secret string of your choice (you'll reuse it
              in the next step)
            </li>
          </ul>
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
        title="Configure the webhook in Meta"
        description={
          <span>
            {'In your Meta app, go to '}
            <strong className="text-text-sub">WhatsApp &gt; Configuration</strong>
            {
              '. Paste the webhook URL below as the Callback URL, and set the Verify Token to the same secret string you entered in the previous step.'
            }
          </span>
        }
        extraContent={
          <InlineToast
            className="mt-2 w-full"
            variant="tip"
            title="Important:"
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
        extraContent={
          <InlineToast
            className="mt-2 w-full"
            variant="tip"
            title="Production tip:"
            description="The access token from API Setup is temporary. For production, generate a permanent System User Token in your Meta Business Settings."
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
      connectedMessage="Your WhatsApp Business account is connected. This agent is ready to receive messages."
      listeningMessage="Send a WhatsApp message to your business number to verify configuration."
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
