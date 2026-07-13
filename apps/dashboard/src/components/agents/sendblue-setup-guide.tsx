import { ChatProviderIdEnum } from '@novu/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RiChat3Line,
  RiCheckLine,
  RiErrorWarningLine,
  RiKey2Line,
  RiSendPlaneFill,
  RiSmartphoneLine,
} from 'react-icons/ri';
import type { AgentResponse, SendSendblueTestMessageError } from '@/api/agents';
import { patchSubscriber } from '@/api/subscribers';
import { useConnectSubscriber } from '@/components/connect/connect-subscriber-provider';
import { ProviderIcon } from '@/components/integrations/components/provider-icon';
import { Button } from '@/components/primitives/button';
import { InlineToast } from '@/components/primitives/inline-toast';
import { InputPure, InputRoot, InputWrapper } from '@/components/primitives/input';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useConfigureSendblueWebhook } from '@/hooks/use-configure-sendblue-webhook';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { useFetchSubscriber } from '@/hooks/use-fetch-subscriber';
import { useRemoveSendblueWebhooks } from '@/hooks/use-remove-sendblue-webhooks';
import { useSendSendblueTestMessage } from '@/hooks/use-send-sendblue-test-message';
import { QueryKeys } from '@/utils/query-keys';
import {
  IntegrationCredentialsSidebar,
  ListeningStatus,
  ProviderSetupStepperRail,
  ReadOnlyValueRow,
  SetupButton,
  SetupStep,
  SetupStepperRail,
} from './setup-guide-primitives';
import {
  buildAgentWebhookUrl,
  buildImessageFallbackHref,
  deriveStepStatus,
  hasSendblueUserCredentials,
} from './setup-guide-step-utils';

const PHONE_PATTERN = /^\+[1-9]\d{6,14}$/;

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
  | { state: 'manual_fallback'; message: string }
  | { state: 'error'; message: string };

function ManualWebhookFallback({
  message,
  onMarkConnected,
  onOpenCredentials,
}: {
  message: string;
  onMarkConnected: () => void;
  onOpenCredentials: () => void;
}) {
  return (
    <div className="border-warning-base/40 bg-warning-base/4 flex w-full flex-col gap-2 rounded-md border p-3">
      <div className="text-warning-base flex items-center gap-1.5">
        <RiErrorWarningLine className="size-4" />
        <span className="text-label-xs font-medium">{message}</span>
      </div>
      <p className="text-text-soft text-label-xs leading-4">
        In the Sendblue dashboard open <strong className="text-text-sub">API &gt; Webhooks</strong>, add a{' '}
        <strong className="text-text-sub">receive</strong> webhook using the Callback URL and secret from{' '}
        <strong className="text-text-sub">Edit credentials</strong> below, then save.
      </p>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          mode="outline"
          size="xs"
          className="w-fit gap-1.5"
          onClick={onOpenCredentials}
        >
          Edit credentials
        </Button>
        <button
          type="button"
          onClick={onMarkConnected}
          className="text-text-sub hover:text-text-strong text-label-xs font-medium underline"
        >
          Mark as configured
        </button>
      </div>
    </div>
  );
}

function StaleNovuWebhooksWarning({
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

  const handleRemove = useCallback(async () => {
    try {
      const result = await removeWebhooks({ agentIdentifier, integrationIdentifier, webhookUrls: staleWebhookUrls });

      if (result.success) {
        showSuccessToast('Removed the old Novu webhook(s) from your Sendblue account.');
        onRemoved();

        return;
      }

      showErrorToast(result.message ?? "Sendblue didn't accept the webhook removal.");
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : 'Something went wrong removing the old webhook(s).');
    }
  }, [agentIdentifier, integrationIdentifier, onRemoved, removeWebhooks, staleWebhookUrls]);

  const webhookCountLabel = `${staleWebhookUrls.length} old webhook${staleWebhookUrls.length > 1 ? 's' : ''}`;

  return (
    <InlineToast
      variant="warning"
      title="Another Novu webhook is already registered on this Sendblue account."
      description={`Sendblue webhooks are account-level, so every inbound message currently triggers all of them — expect duplicate agent replies until ${webhookCountLabel} is removed.`}
      ctaLabel="Remove old webhook(s)"
      onCtaClick={handleRemove}
      isCtaLoading={isPending}
    />
  );
}

function ConnectWebhookPanel({
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
  const [connectStatus, setConnectStatus] = useState<ConnectStatus>({ state: 'idle' });
  const [manualMarkedConfigured, setManualMarkedConfigured] = useState(false);
  const [staleNovuWebhookUrls, setStaleNovuWebhookUrls] = useState<string[]>([]);

  const { mutateAsync: configureWebhook } = useConfigureSendblueWebhook();

  useEffect(() => {
    setConnectStatus({ state: 'idle' });
    setManualMarkedConfigured(false);
    setStaleNovuWebhookUrls([]);
  }, [integrationIdentifier]);

  const handleConnect = useCallback(async () => {
    setConnectStatus({ state: 'connecting' });

    try {
      const result = await configureWebhook({
        agentIdentifier: agent.identifier,
        integrationIdentifier,
      });

      setStaleNovuWebhookUrls(result.existingNovuWebhookUrls ?? []);

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
        <div className="flex flex-col gap-1">
          <div className="text-success-base flex items-center gap-1.5">
            <RiCheckLine className="size-4" />
            <span className="text-label-xs font-medium">Webhook already configured</span>
          </div>
          <button
            type="button"
            onClick={onOpenCredentials}
            className="text-text-sub hover:text-text-strong w-fit text-label-xs font-medium underline"
          >
            View Callback URL and secret in Edit credentials
          </button>
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

      {showManualFallback && connectStatus.state === 'manual_fallback' ? (
        <ManualWebhookFallback
          message={connectStatus.message}
          onOpenCredentials={onOpenCredentials}
          onMarkConnected={() => {
            setManualMarkedConfigured(true);
            onConfigured();
          }}
        />
      ) : null}

      {staleNovuWebhookUrls.length > 0 ? (
        <StaleNovuWebhooksWarning
          agentIdentifier={agent.identifier}
          integrationIdentifier={integrationIdentifier}
          staleWebhookUrls={staleNovuWebhookUrls}
          onRemoved={() => setStaleNovuWebhookUrls([])}
        />
      ) : null}
    </div>
  );
}

type TestStatus =
  | { state: 'idle' }
  | { state: 'sending' }
  | { state: 'sent' }
  | { state: 'error'; message: string; code?: SendSendblueTestMessageError['code'] };

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

function SendTestMessagePanel({
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
  const [testStatus, setTestStatus] = useState<TestStatus>({ state: 'idle' });
  const [phone, setPhone] = useState('');

  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();
  const { mutateAsync: sendTestMessage } = useSendSendblueTestMessage();

  const { data: subscriber } = useFetchSubscriber({
    subscriberId: connectSubscriberId,
    options: { enabled: Boolean(connectSubscriberId) },
  });

  useEffect(() => {
    setTestStatus({ state: 'idle' });
  }, [integrationIdentifier]);

  useEffect(() => {
    const savedPhone = subscriber?.phone?.trim();

    if (savedPhone) {
      setPhone(savedPhone);
    }
  }, [subscriber?.phone]);

  const handleSendTest = useCallback(async () => {
    if (!PHONE_PATTERN.test(phone.trim())) {
      setTestStatus({
        state: 'error',
        message: 'Enter a phone number in international format, including the country code.',
      });

      return;
    }

    setTestStatus({ state: 'sending' });

    try {
      const environment = requireEnvironment(currentEnvironment, 'No environment selected');
      const normalizedPhone = phone.trim();

      await patchSubscriber({
        environment,
        subscriberId: connectSubscriberId,
        subscriber: { phone: normalizedPhone },
      });

      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchSubscriber, environment._id, connectSubscriberId],
      });

      const result = await sendTestMessage({
        agentIdentifier: agent.identifier,
        integrationIdentifier,
        subscriberId: connectSubscriberId,
      });

      if (result.success) {
        setTestStatus({ state: 'sent' });

        return;
      }

      setTestStatus({
        state: 'error',
        message: result.error?.message ?? "Sendblue didn't accept the test message.",
        code: result.error?.code,
      });
    } catch (err) {
      setTestStatus({
        state: 'error',
        message: err instanceof Error ? err.message : 'Something went wrong sending the test message.',
      });
    }
  }, [
    agent.identifier,
    connectSubscriberId,
    currentEnvironment,
    integrationIdentifier,
    phone,
    queryClient,
    sendTestMessage,
  ]);

  const imessageHref = fromNumber ? buildImessageFallbackHref(fromNumber, agent.name) : undefined;
  const isRecipientNotVerified = testStatus.state === 'error' && testStatus.code === 'recipient_not_verified';

  return (
    <div className="flex w-full max-w-[400px] flex-col gap-3">
      {isRecipientNotVerified ? (
        <RecipientNotVerifiedPanel
          fromNumber={fromNumber}
          imessageHref={imessageHref}
          onTryAgain={() => setTestStatus({ state: 'idle' })}
        />
      ) : (
        <>
          <div className="flex items-stretch gap-2">
            <InputRoot size="xs" hasError={testStatus.state === 'error'} className="flex-1">
              <InputWrapper>
                <InputPure
                  value={phone}
                  onChange={(event) => {
                    setPhone(event.target.value);

                    if (testStatus.state === 'error') {
                      setTestStatus({ state: 'idle' });
                    }
                  }}
                  type="tel"
                  inputMode="tel"
                  placeholder="+14155551234"
                  autoComplete="tel"
                  disabled={testStatus.state === 'sending'}
                />
              </InputWrapper>
            </InputRoot>
            <Button
              type="button"
              variant="secondary"
              size="xs"
              className="gap-1.5 px-2"
              onClick={handleSendTest}
              disabled={!phone || testStatus.state === 'sending'}
              isLoading={testStatus.state === 'sending'}
              leadingIcon={RiSendPlaneFill}
            >
              Send test
            </Button>
          </div>
          {testStatus.state === 'sent' ? (
            <p className="text-success-base text-label-xs leading-4">
              Sent: check your Messages app for the reply from your Sendblue number.
            </p>
          ) : null}
          {testStatus.state === 'error' ? (
            <p className="text-error-base text-label-xs leading-4">{testStatus.message}</p>
          ) : null}
          {imessageHref ? (
            <a
              href={imessageHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-sub hover:text-text-strong inline-flex w-fit items-center gap-1.5 text-label-xs font-medium underline"
            >
              <RiSmartphoneLine className="size-3.5" />
              Text via iMessage instead
            </a>
          ) : null}
        </>
      )}
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
  const webhookUrl = buildAgentWebhookUrl(agent._id, selectedIntegrationIdentifier || 'YOUR_INTEGRATION_IDENTIFIER');
  // Only surface the Callback URL in the credentials sidebar once there's a real integration identifier to build it from.
  const webhookUrlForCredentials = selectedIntegrationIdentifier ? webhookUrl : undefined;

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
            isCredentialsSaved={isCredentialsSaved && Boolean(selectedIntegrationIdentifier)}
            existingWebhookSecret={existingWebhookSecret}
            onConfigured={() => setIsWebhookConfiguredLocally(true)}
            onOpenCredentials={() => setIsCredentialsSidebarOpen(true)}
          />
        }
      />

      <SetupStep
        index={base + 2}
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
            <SendTestMessagePanel
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
          webhookUrl={webhookUrlForCredentials}
          webhookSecret={existingWebhookSecret}
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
        webhookUrl={webhookUrlForCredentials}
        webhookSecret={existingWebhookSecret}
      />
    </>
  );
}
