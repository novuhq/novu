import { ChatProviderIdEnum } from '@novu/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RiCheckLine, RiErrorWarningLine, RiKey2Line } from 'react-icons/ri';
import type { AgentResponse } from '@/api/agents';
import { ProviderIcon } from '@/components/integrations/components/provider-icon';
import { Button } from '@/components/primitives/button';
import { useConfigureSendblueWebhook } from '@/hooks/use-configure-sendblue-webhook';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import {
  IntegrationCredentialsSidebar,
  ListeningStatus,
  ProviderSetupStepperRail,
  ReadOnlyValueRow,
  SetupButton,
  SetupStep,
  SetupStepperRail,
} from './setup-guide-primitives';
import { buildAgentWebhookUrl, deriveStepStatus, hasSendblueUserCredentials } from './setup-guide-step-utils';

const SENDBLUE_DASHBOARD_URL = 'https://dashboard.sendblue.com/settings/api';

export type SendblueSetupGuideProps = {
  agent: AgentResponse;
  integrationId: string;
  stepOffset?: number;
  onStepsCompleted?: () => void;
  embedded?: boolean;
};

type ConnectStatus =
  | { state: 'idle' }
  | { state: 'connecting' }
  | { state: 'connected' }
  | { state: 'manual_fallback'; message: string; webhookSecret?: string }
  | { state: 'error'; message: string };

function ManualWebhookFallback({
  message,
  webhookUrl,
  webhookSecret,
  onMarkConnected,
}: {
  message: string;
  webhookUrl: string;
  webhookSecret?: string;
  onMarkConnected: () => void;
}) {
  return (
    <div className="border-warning-base/40 bg-warning-base/4 flex w-full flex-col gap-2 rounded-md border p-3">
      <div className="text-warning-base flex items-center gap-1.5">
        <RiErrorWarningLine className="size-4" />
        <span className="text-label-xs font-medium">{message}</span>
      </div>
      <p className="text-text-soft text-label-xs leading-4">
        In the Sendblue dashboard open <strong className="text-text-sub">API &gt; Webhooks</strong>, add a{' '}
        <strong className="text-text-sub">receive</strong> webhook with the Callback URL below
        {webhookSecret ? ' and set its secret to the value below' : ''}, then save.
      </p>
      <ReadOnlyValueRow label="Callback URL" value={webhookUrl} />
      {webhookSecret ? <ReadOnlyValueRow label="Webhook Secret" value={webhookSecret} /> : null}
      <Button
        type="button"
        variant="secondary"
        mode="outline"
        size="xs"
        className="w-fit gap-1.5"
        onClick={onMarkConnected}
      >
        Mark as configured
      </Button>
    </div>
  );
}

function ConnectWebhookPanel({
  agent,
  integrationIdentifier,
  webhookUrl,
  isCredentialsSaved,
  existingWebhookSecret,
  onConfigured,
}: {
  agent: AgentResponse;
  integrationIdentifier: string;
  webhookUrl: string;
  isCredentialsSaved: boolean;
  existingWebhookSecret: string;
  onConfigured: () => void;
}) {
  const [connectStatus, setConnectStatus] = useState<ConnectStatus>({ state: 'idle' });
  const [manualMarkedConfigured, setManualMarkedConfigured] = useState(false);

  const { mutateAsync: configureWebhook } = useConfigureSendblueWebhook();

  useEffect(() => {
    setConnectStatus({ state: 'idle' });
    setManualMarkedConfigured(false);
  }, [integrationIdentifier]);

  const handleConnect = useCallback(async () => {
    setConnectStatus({ state: 'connecting' });

    try {
      const result = await configureWebhook({
        agentIdentifier: agent.identifier,
        integrationIdentifier,
      });

      if (result.success) {
        setConnectStatus({ state: 'connected' });
        onConfigured();

        return;
      }

      if (result.fallbackToManual) {
        setConnectStatus({
          state: 'manual_fallback',
          message:
            result.reason?.message ??
            "We couldn't register the webhook automatically. Add it manually in the Sendblue dashboard below.",
          webhookSecret: result.webhookSecret,
        });

        return;
      }

      setConnectStatus({
        state: 'error',
        message: result.reason?.message ?? "Sendblue didn't accept the webhook registration.",
      });
    } catch (err) {
      setConnectStatus({
        state: 'error',
        message: err instanceof Error ? err.message : 'Something went wrong contacting Sendblue.',
      });
    }
  }, [agent.identifier, configureWebhook, integrationIdentifier, onConfigured]);

  const connectAttemptFinished = connectStatus.state === 'connected' || connectStatus.state === 'manual_fallback';
  const showManualFallback = connectStatus.state === 'manual_fallback' && !manualMarkedConfigured;
  // Detects a webhook secret provisioned in a previous session (auto-registered or manually confirmed).
  const showExistingSecret = connectStatus.state === 'idle' && Boolean(existingWebhookSecret);

  return (
    <div className="flex w-full max-w-[400px] flex-col gap-3">
      {showExistingSecret ? (
        <div className="text-success-base flex items-center gap-1.5">
          <RiCheckLine className="size-4" />
          <span className="text-label-xs font-medium">Webhook already configured</span>
        </div>
      ) : null}

      {!connectAttemptFinished ? (
        <Button
          type="button"
          variant="primary"
          size="xs"
          className="w-fit gap-1.5 px-2 py-1.5"
          onClick={handleConnect}
          disabled={!isCredentialsSaved || connectStatus.state === 'connecting'}
          isLoading={connectStatus.state === 'connecting'}
        >
          {connectStatus.state === 'connecting'
            ? 'Connecting…'
            : showExistingSecret
              ? 'Reconfigure webhook'
              : 'Connect Sendblue'}
        </Button>
      ) : (
        <div className="text-success-base flex items-center gap-1.5">
          <RiCheckLine className="size-4" />
          <span className="text-label-xs font-medium">
            {manualMarkedConfigured || connectStatus.state === 'connected'
              ? 'Webhook configured: send a test message'
              : 'Webhook URL ready: finish in Sendblue'}
          </span>
        </div>
      )}

      {connectStatus.state === 'error' ? (
        <p className="text-error-base text-label-xs leading-4">{connectStatus.message}</p>
      ) : null}

      {showExistingSecret ? (
        <div className="border-stroke-soft flex w-full flex-col gap-2 rounded-md border p-3">
          <ReadOnlyValueRow label="Callback URL" value={webhookUrl} />
          <ReadOnlyValueRow label="Webhook Secret" value={existingWebhookSecret} />
        </div>
      ) : null}

      {showManualFallback && connectStatus.state === 'manual_fallback' ? (
        <ManualWebhookFallback
          message={connectStatus.message}
          webhookUrl={webhookUrl}
          webhookSecret={connectStatus.webhookSecret}
          onMarkConnected={() => {
            setManualMarkedConfigured(true);
            onConfigured();
          }}
        />
      ) : null}
    </div>
  );
}

export function SendblueSetupGuide({
  agent,
  integrationId,
  stepOffset = 1,
  onStepsCompleted,
  embedded = false,
}: SendblueSetupGuideProps) {
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
  const webhookUrl = buildAgentWebhookUrl(agent._id, selectedIntegrationIdentifier || 'YOUR_INTEGRATION_IDENTIFIER');

  const base = stepOffset;

  const firstIncompleteStep = useMemo(() => {
    if (isConnected) {
      return base + 3;
    }

    if (isWebhookConfigured) {
      return base + 2;
    }

    if (isCredentialsSaved) {
      return base + 1;
    }

    return base;
  }, [base, isCredentialsSaved, isWebhookConfigured, isConnected]);

  const step3Status = deriveStepStatus(base + 2, firstIncompleteStep);

  const stepsColumn = (
    <>
      <SetupStep
        index={base}
        status={deriveStepStatus(base, firstIncompleteStep)}
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
        index={base + 1}
        status={deriveStepStatus(base + 1, firstIncompleteStep)}
        title="Configure the receive webhook"
        description={
          isCredentialsSaved
            ? 'Click Connect Sendblue: Novu will register its inbound webhook with your Sendblue account so incoming iMessage/SMS messages reach your agent.'
            : 'Save your credentials above first. Then come back here to register the webhook with Sendblue in one click.'
        }
        rightContent={
          <ConnectWebhookPanel
            agent={agent}
            integrationIdentifier={selectedIntegrationIdentifier}
            webhookUrl={webhookUrl}
            isCredentialsSaved={isCredentialsSaved && Boolean(selectedIntegrationIdentifier)}
            existingWebhookSecret={existingWebhookSecret}
            onConfigured={() => setIsWebhookConfiguredLocally(true)}
          />
        }
      />

      <SetupStep
        index={base + 2}
        status={step3Status}
        title="Send a test message"
        description={
          <span>
            {'Text your Sendblue number'}
            {fromNumber ? (
              <>
                {' ('}
                <strong className="text-text-sub">{fromNumber}</strong>
                {')'}
              </>
            ) : null}
            {' from your phone. If everything is configured correctly, your agent will reply in the same conversation.'}
          </span>
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
