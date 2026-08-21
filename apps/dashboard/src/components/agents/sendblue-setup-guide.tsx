import { ChatProviderIdEnum } from '@novu/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RiChat3Line, RiKey2Line, RiSmartphoneLine } from 'react-icons/ri';
import type { AgentResponse } from '@/api/agents';
import { useConnectSubscriber } from '@/components/connect/connect-subscriber-provider';
import { useConfigureSendblueWebhook } from '@/hooks/use-configure-sendblue-webhook';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { useRemoveSendblueWebhooks } from '@/hooks/use-remove-sendblue-webhooks';
import { useSendSendblueTestMessage } from '@/hooks/use-send-sendblue-test-message';
import { ConnectWebhookPanel, SendTestMessagePanel, StaleNovuWebhooksWarning } from './imessage-guide-panels';
import { ImessageProviderSelect } from './imessage-provider-select';
import {
  IntegrationCredentialsSidebar,
  ListeningStatus,
  ProviderSetupStepperRail,
  ReadOnlyValueRow,
  SetupButton,
  SetupStep,
  SetupStepperRail,
} from './setup-guide-primitives';
import { buildImessageFallbackHref, deriveStepStatus, hasSendblueUserCredentials } from './setup-guide-step-utils';

const SENDBLUE_DASHBOARD_URL = 'https://dashboard.sendblue.com/settings/api';

export type SendblueSetupGuideProps = {
  agent: AgentResponse;
  integrationId: string;
  stepOffset?: number;
  onStepsCompleted?: () => void;
  embedded?: boolean;
};

const SENDBLUE_MANUAL_INSTRUCTIONS = (
  <>
    In the Sendblue dashboard open <strong className="text-text-sub">API &gt; Webhooks</strong>, add a{' '}
    <strong className="text-text-sub">receive</strong> webhook using the Callback URL and secret from{' '}
    <strong className="text-text-sub">Edit credentials</strong> below, then save.
  </>
);

function SendblueStaleWarning({
  agentIdentifier,
  integrationIdentifier,
  staleWebhookUrls,
  onRemoved,
}: {
  agentIdentifier: string;
  integrationIdentifier: string;
  staleWebhookUrls: string[];
  onRemoved: () => void;
}) {
  const { mutateAsync: removeWebhooks, isPending } = useRemoveSendblueWebhooks();

  return (
    <StaleNovuWebhooksWarning
      providerLabel="Sendblue"
      scopeNoun="account"
      descriptionPrefix="Sendblue webhooks are account-level, so every inbound message currently triggers all of them"
      staleWebhookUrls={staleWebhookUrls}
      removeWebhooks={(webhookUrls) => removeWebhooks({ agentIdentifier, integrationIdentifier, webhookUrls })}
      isRemoving={isPending}
      onRemoved={onRemoved}
    />
  );
}

function SendblueWebhookPanel({
  agent,
  integrationIdentifier,
  isCredentialsSaved,
  existingWebhookSecret,
  onConfigured,
  onOpenCredentials,
}: {
  agent: AgentResponse;
  integrationIdentifier: string;
  isCredentialsSaved: boolean;
  existingWebhookSecret: string;
  onConfigured: () => void;
  onOpenCredentials: () => void;
}) {
  const { mutateAsync: configureWebhook } = useConfigureSendblueWebhook();

  return (
    <ConnectWebhookPanel
      providerLabel="Sendblue"
      connectLabel="Connect Sendblue"
      busyLabel="Connecting…"
      integrationIdentifier={integrationIdentifier}
      isCredentialsSaved={isCredentialsSaved}
      hasWebhookSecret={Boolean(existingWebhookSecret)}
      configureWebhook={() => configureWebhook({ agentIdentifier: agent.identifier, integrationIdentifier })}
      manualInstructions={SENDBLUE_MANUAL_INSTRUCTIONS}
      existingSecretExtra={
        <button
          type="button"
          onClick={onOpenCredentials}
          className="text-text-sub hover:text-text-strong w-fit text-label-xs font-medium underline"
        >
          View Callback URL and secret in Edit credentials
        </button>
      }
      staleWarning={(staleWebhookUrls, onRemoved) => (
        <SendblueStaleWarning
          agentIdentifier={agent.identifier}
          integrationIdentifier={integrationIdentifier}
          staleWebhookUrls={staleWebhookUrls}
          onRemoved={onRemoved}
        />
      )}
      onConfigured={onConfigured}
      onOpenCredentials={onOpenCredentials}
    />
  );
}

function RecipientNotVerifiedPanel({
  fromNumber,
  imessageHref,
  onTryAgain,
}: {
  fromNumber: string;
  imessageHref?: string;
  onTryAgain: () => void;
}) {
  return (
    <div className="border-information-base/40 bg-information-base/4 flex w-full flex-col gap-3 rounded-md border p-3">
      <div className="flex flex-col gap-2">
        <div className="text-information-base flex items-center gap-1.5">
          <RiChat3Line className="size-4" />
          <span className="text-label-xs font-medium">You need to message this number first</span>
        </div>
        <p className="text-text-soft text-label-xs leading-4">
          Sendblue only allows replies to numbers that have already texted it. Send a quick message to the number below
          to start the conversation, then your agent will be able to reply here.
        </p>
      </div>
      {fromNumber ? <ReadOnlyValueRow label="Sendblue number" value={fromNumber} /> : null}
      <div className="flex items-center gap-3">
        {imessageHref ? (
          <SetupButton href={imessageHref} leadingIcon={<RiSmartphoneLine className="size-3.5" />}>
            Message {fromNumber || 'this number'}
          </SetupButton>
        ) : null}
        <button
          type="button"
          onClick={onTryAgain}
          className="text-text-sub hover:text-text-strong text-label-xs font-medium underline"
        >
          I've sent a message, try again
        </button>
      </div>
    </div>
  );
}

function SendblueTestPanel({
  agent,
  integrationIdentifier,
  connectSubscriberId,
  fromNumber,
}: {
  agent: AgentResponse;
  integrationIdentifier: string;
  connectSubscriberId: string;
  fromNumber: string;
}) {
  const { mutateAsync: sendTestMessage } = useSendSendblueTestMessage();
  const imessageHref = fromNumber ? buildImessageFallbackHref(fromNumber, agent.name) : undefined;

  return (
    <SendTestMessagePanel
      providerLabel="Sendblue"
      integrationIdentifier={integrationIdentifier}
      connectSubscriberId={connectSubscriberId}
      sendTestMessage={(subscriberId) =>
        sendTestMessage({ agentIdentifier: agent.identifier, integrationIdentifier, subscriberId })
      }
      specialErrorCode="recipient_not_verified"
      renderSpecialError={(_phone, reset) => (
        <RecipientNotVerifiedPanel fromNumber={fromNumber} imessageHref={imessageHref} onTryAgain={reset} />
      )}
      footer={
        imessageHref ? (
          <a
            href={imessageHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-sub hover:text-text-strong inline-flex w-fit items-center gap-1.5 text-label-xs font-medium underline"
          >
            <RiSmartphoneLine className="size-3.5" />
            Text via iMessage instead
          </a>
        ) : undefined
      }
    />
  );
}

export function SendblueSetupGuide({
  agent,
  integrationId,
  stepOffset = 1,
  onStepsCompleted,
  embedded = false,
}: SendblueSetupGuideProps) {
  const { subscriberId: connectSubscriberId, isReady: isConnectSubscriberReady } = useConnectSubscriber();
  const [isCredentialsSidebarOpen, setIsCredentialsSidebarOpen] = useState(false);
  const [credentialsSavedLocally, setCredentialsSavedLocally] = useState(false);
  const [isWebhookConfiguredLocally, setIsWebhookConfiguredLocally] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset when the watched integration changes
  useEffect(() => {
    setIsConnected(false);
    setCredentialsSavedLocally(false);
    setIsWebhookConfiguredLocally(false);
  }, [integrationId]);

  const handleConnected = useCallback(() => {
    setIsConnected(true);
    onStepsCompleted?.();
  }, [onStepsCompleted]);

  const { integrations } = useFetchIntegrations();

  const selectedIntegration = useMemo(
    () => integrations?.find((i) => i._id === integrationId && i.providerId === ChatProviderIdEnum.Sendblue),
    [integrations, integrationId]
  );

  const selectedIntegrationIdentifier = selectedIntegration?.identifier ?? '';
  const hasCredentials = hasSendblueUserCredentials(selectedIntegration?.credentials);
  const isCredentialsSaved = hasCredentials || credentialsSavedLocally;

  // Set by the Configure webhook step; also detects a webhook configured in a previous session.
  const existingWebhookSecret =
    typeof selectedIntegration?.credentials?.token === 'string' ? selectedIntegration.credentials.token.trim() : '';
  const hasWebhookSecret = existingWebhookSecret.length > 0;
  const isWebhookConfigured = isWebhookConfiguredLocally || hasWebhookSecret;

  const fromNumber = (selectedIntegration?.credentials?.from as string | undefined) ?? '';

  const base = stepOffset;

  // The provider-select step (base) is completed on mount since Sendblue is preselected, so the
  // three real setup steps follow at base+1..base+3.
  const firstIncompleteStep = useMemo(() => {
    if (isConnected) {
      return base + 4;
    }

    if (isWebhookConfigured) {
      return base + 3;
    }

    if (isCredentialsSaved) {
      return base + 2;
    }

    return base + 1;
  }, [base, isCredentialsSaved, isWebhookConfigured, isConnected]);

  const step3Status = deriveStepStatus(base + 3, firstIncompleteStep);

  const stepsColumn = (
    <>
      <SetupStep
        index={base}
        status="completed"
        title="Setup iMessage via"
        description="Choose a provider to connect iMessage to your agent."
        rightContent={<ImessageProviderSelect value={ChatProviderIdEnum.Sendblue} />}
      />

      <SetupStep
        index={base + 1}
        status={deriveStepStatus(base + 1, firstIncompleteStep)}
        title="Get your Sendblue API credentials and save them in Novu"
        description={
          <span>
            {'Open the '}
            <a
              href={SENDBLUE_DASHBOARD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-sub underline"
            >
              Sendblue dashboard
            </a>
            {', copy your '}
            <strong className="text-text-sub">API Key</strong>
            {', '}
            <strong className="text-text-sub">Secret Key</strong>
            {', and one of your registered '}
            <strong className="text-text-sub">phone numbers</strong>
            {' (in E.164 format, e.g. +15551234567), then save them in the credentials form.'}
          </span>
        }
        rightContent={
          <div className="flex flex-col gap-3">
            <SetupButton
              leadingIcon={<RiKey2Line className="size-3.5" />}
              onClick={() => setIsCredentialsSidebarOpen(true)}
            >
              {isCredentialsSaved ? 'Edit credentials' : 'Configure credentials'}
            </SetupButton>
          </div>
        }
      />

      <SetupStep
        index={base + 2}
        status={deriveStepStatus(base + 2, firstIncompleteStep)}
        title="Configure the receive webhook"
        description={
          isCredentialsSaved
            ? 'Click Connect Sendblue: Novu will register its inbound webhook with your Sendblue account so incoming iMessage/SMS messages reach your agent.'
            : 'Save your credentials above first. Then come back here to register the webhook with Sendblue in one click.'
        }
        rightContent={
          <SendblueWebhookPanel
            agent={agent}
            integrationIdentifier={selectedIntegrationIdentifier}
            isCredentialsSaved={isCredentialsSaved && Boolean(selectedIntegrationIdentifier)}
            existingWebhookSecret={existingWebhookSecret}
            onConfigured={() => setIsWebhookConfiguredLocally(true)}
            onOpenCredentials={() => setIsCredentialsSidebarOpen(true)}
          />
        }
      />

      <SetupStep
        index={base + 3}
        status={step3Status}
        dimmed={!isWebhookConfigured}
        title="Send a test message"
        description={
          <span>
            {'Send yourself a message from your Sendblue number'}
            {fromNumber ? (
              <>
                {' ('}
                <strong className="text-text-sub">{fromNumber}</strong>
                {')'}
              </>
            ) : null}
            {
              ', or text it yourself from your phone. If everything is configured correctly, your agent will reply in the same conversation.'
            }
          </span>
        }
        rightContent={
          isConnectSubscriberReady ? (
            <SendblueTestPanel
              agent={agent}
              integrationIdentifier={selectedIntegrationIdentifier}
              connectSubscriberId={connectSubscriberId}
              fromNumber={fromNumber}
            />
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
      connectedMessage="Sendblue is connected: your agent is ready to receive messages."
      listeningMessage="Waiting for the first inbound message from Sendblue…"
    />
  );

  if (embedded) {
    return (
      <div className="flex flex-col gap-0">
        <SetupStepperRail className="py-6 pb-3 pr-3 md:pr-6">{stepsColumn}</SetupStepperRail>
        <div className="pl-8">{listening}</div>
        <IntegrationCredentialsSidebar
          integrationId={integrationId}
          isOpen={isCredentialsSidebarOpen}
          onClose={() => setIsCredentialsSidebarOpen(false)}
          onSaveSuccess={() => setCredentialsSavedLocally(true)}
          agentOnboarding
        />
      </div>
    );
  }

  return (
    <>
      <ProviderSetupStepperRail>{stepsColumn}</ProviderSetupStepperRail>
      <div className="pl-8">{listening}</div>
      <IntegrationCredentialsSidebar
        integrationId={integrationId}
        isOpen={isCredentialsSidebarOpen}
        onClose={() => setIsCredentialsSidebarOpen(false)}
        onSaveSuccess={() => setCredentialsSavedLocally(true)}
        agentOnboarding
      />
    </>
  );
}
