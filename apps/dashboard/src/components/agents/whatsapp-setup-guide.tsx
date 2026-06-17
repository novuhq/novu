import { ChatProviderIdEnum, CredentialsKeyEnum, FeatureFlagsKeysEnum, type ICredentials } from '@novu/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RiArrowRightUpLine, RiCheckLine, RiErrorWarningLine, RiKey2Line, RiSendPlaneFill } from 'react-icons/ri';
import type { AgentResponse } from '@/api/agents';
import { patchSubscriber } from '@/api/subscribers';
import { useConnectSubscriber } from '@/components/connect/connect-subscriber-provider';
import { ProviderIcon } from '@/components/integrations/components/provider-icon';
import { Button } from '@/components/primitives/button';
import { CopyButton } from '@/components/primitives/copy-button';
import { InlineToast } from '@/components/primitives/inline-toast';
import { InputPure, InputRoot, InputWrapper } from '@/components/primitives/input';
import { getAgentApiBaseUrl, isWhatsAppEmbeddedSignupConfigured } from '@/config';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useConfigureWhatsAppWebhook } from '@/hooks/use-configure-whatsapp-webhook';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { useFetchSubscriber } from '@/hooks/use-fetch-subscriber';
import { useSendWhatsAppTestTemplate } from '@/hooks/use-send-whatsapp-test-template';
import { QueryKeys } from '@/utils/query-keys';
import { cn } from '@/utils/ui';
import { IntegrationCredentialsSidebar, ListeningStatus, SetupButton, SetupStep } from './setup-guide-primitives';
import { deriveStepStatus, hasWhatsAppUserCredentials } from './setup-guide-step-utils';
import { WhatsAppEmbeddedSignupButton } from './whatsapp-embedded-signup-button';

export type WhatsAppSetupGuideProps = {
  agent: AgentResponse;
  integrationId: string;
  stepOffset?: number;
  onStepsCompleted?: () => void;
  embedded?: boolean;
};

const PHONE_PATTERN = /^\+[1-9]\d{6,14}$/;

function buildAgentWebhookUrl(agentId: string, integrationIdentifier: string): string {
  return `${getAgentApiBaseUrl()}/v1/agents/${agentId}/webhook/${integrationIdentifier}`;
}

function buildWhatsAppDeepLink(displayPhoneNumber: string): string {
  const digits = displayPhoneNumber.replace(/\D/g, '');

  if (!digits) {
    return '';
  }

  return `https://wa.me/${digits}?text=${encodeURIComponent('Hi')}`;
}

function EmbeddedSignupInboundTestPanel({
  connectSubscriberId,
  credentials,
}: {
  connectSubscriberId: string;
  credentials: ICredentials | undefined;
}) {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data: subscriber } = useFetchSubscriber({
    subscriberId: connectSubscriberId,
    options: { enabled: Boolean(connectSubscriberId) },
  });

  const savedPhone = subscriber?.phone?.trim() ?? '';
  const isPhoneSaved = Boolean(savedPhone);

  useEffect(() => {
    if (savedPhone) {
      setPhone(savedPhone);
    }
  }, [savedPhone, connectSubscriberId]);

  const businessDisplayPhone =
    typeof credentials?.[CredentialsKeyEnum.From] === 'string' ? credentials[CredentialsKeyEnum.From].trim() : '';
  const whatsAppUrl = businessDisplayPhone ? buildWhatsAppDeepLink(businessDisplayPhone) : '';

  const handleSavePhone = useCallback(async () => {
    if (!PHONE_PATTERN.test(phone.trim())) {
      setSaveError('Enter a phone number in international format, including the country code.');

      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const environment = requireEnvironment(currentEnvironment, 'No environment selected');

      await patchSubscriber({
        environment,
        subscriberId: connectSubscriberId,
        subscriber: { phone: phone.trim() },
      });

      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchSubscriber, environment._id, connectSubscriberId],
      });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Something went wrong saving your phone number.');
    } finally {
      setIsSaving(false);
    }
  }, [connectSubscriberId, currentEnvironment, phone, queryClient]);

  if (!isPhoneSaved) {
    return (
      <div className="border-stroke-soft flex w-full max-w-[400px] flex-col gap-2 rounded-md border p-3">
        <p className="text-text-strong text-label-xs font-medium leading-4">Your phone number</p>
        <p className="text-text-soft text-label-xs leading-4">
          Enter the number you&rsquo;ll message from so Novu can link inbound replies to your account.
        </p>
        <div className="flex items-stretch gap-2">
          <InputRoot size="xs" hasError={Boolean(saveError)} className="flex-1">
            <InputWrapper>
              <InputPure
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value);
                  if (saveError) {
                    setSaveError(null);
                  }
                }}
                type="tel"
                inputMode="tel"
                placeholder="+14155551234"
                autoComplete="tel"
                disabled={isSaving}
              />
            </InputWrapper>
          </InputRoot>
          <Button
            type="button"
            variant="secondary"
            size="xs"
            className="px-2"
            onClick={() => {
              void handleSavePhone();
            }}
            disabled={!phone || isSaving}
            isLoading={isSaving}
          >
            Save
          </Button>
        </div>
        {saveError ? <p className="text-error-base text-label-xs leading-4">{saveError}</p> : null}
      </div>
    );
  }

  return (
    <div className="border-stroke-soft flex w-full max-w-[400px] flex-col gap-3 rounded-md border p-3">
      <p className="text-text-strong text-label-xs font-medium leading-4">Send a message to your business number</p>
      {businessDisplayPhone && whatsAppUrl ? (
        <>
          <ReadOnlyValueRow label="Your WhatsApp business number" value={businessDisplayPhone} />
          <SetupButton href={whatsAppUrl} leadingIcon={<RiSendPlaneFill className="size-3.5" />}>
            Open in WhatsApp
          </SetupButton>
        </>
      ) : (
        <p className="text-text-soft text-label-xs leading-4">
          Send any WhatsApp message to your connected business number to confirm Novu receives it.
        </p>
      )}
      <p className="text-text-soft text-label-xs leading-4">
        Message from <span className="text-text-sub font-medium">{savedPhone}</span> — Novu is listening and will
        confirm as soon as it arrives.
      </p>
    </div>
  );
}

function ReadOnlyValueRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex w-full max-w-[320px] flex-col gap-1.5">
      <p className="text-text-sub text-label-xs font-medium leading-5">{label}</p>
      <div className="border-stroke-soft bg-bg-white flex h-7 items-center overflow-hidden rounded-md border shadow-xs">
        <input
          type="text"
          readOnly
          value={value}
          aria-label={label}
          className="text-text-soft min-w-0 flex-1 truncate bg-transparent px-2 font-mono text-[12px] leading-4 outline-none"
        />
        <CopyButton valueToCopy={value} size="xs" className="border-stroke-soft shrink-0 border-l" />
      </div>
    </div>
  );
}

type ConnectStatus =
  | { state: 'idle' }
  | { state: 'connecting' }
  | { state: 'connected' }
  | { state: 'manual_fallback'; message: string }
  | { state: 'error'; message: string };

function connectStatusLabel(state: ConnectStatus['state'], manualMarkedConfigured: boolean): string {
  if (state === 'manual_fallback') {
    if (manualMarkedConfigured) {
      return 'Webhook configured — send a test message';
    }

    return 'Webhook URL ready — finish in Meta';
  }

  return 'Connected — Novu is listening for messages';
}

type TestStatus =
  | { state: 'idle' }
  | { state: 'sending' }
  | { state: 'sent' }
  | { state: 'pending'; message: string }
  | { state: 'error'; message: string; helpUrl?: string };

function ConnectAndTestPanel({
  agent,
  integrationIdentifier,
  connectSubscriberId,
  webhookUrl,
  verifyToken,
  isCredentialsSaved,
  onConnected,
  skipConnectStep = false,
  usesMetaSampleTemplate = false,
}: {
  agent: AgentResponse;
  integrationIdentifier: string;
  connectSubscriberId: string;
  webhookUrl: string;
  verifyToken: string;
  isCredentialsSaved: boolean;
  onConnected: () => void;
  skipConnectStep?: boolean;
  usesMetaSampleTemplate?: boolean;
}) {
  const [connectStatus, setConnectStatus] = useState<ConnectStatus>(
    skipConnectStep ? { state: 'connected' } : { state: 'idle' }
  );
  const [manualMarkedConfigured, setManualMarkedConfigured] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus>({ state: 'idle' });
  const [phone, setPhone] = useState('');

  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();
  const { mutateAsync: configureWebhook } = useConfigureWhatsAppWebhook();
  const { mutateAsync: sendTestTemplate } = useSendWhatsAppTestTemplate();

  const { data: subscriber } = useFetchSubscriber({
    subscriberId: connectSubscriberId,
    options: { enabled: Boolean(connectSubscriberId) },
  });

  useEffect(() => {
    setConnectStatus(skipConnectStep ? { state: 'connected' } : { state: 'idle' });
    setManualMarkedConfigured(false);
    setTestStatus({ state: 'idle' });
  }, [integrationIdentifier, skipConnectStep]);

  useEffect(() => {
    const savedPhone = subscriber?.phone?.trim();

    if (savedPhone) {
      setPhone(savedPhone);
    }
  }, [subscriber?.phone, integrationIdentifier]);

  useEffect(() => {
    if (!isCredentialsSaved) {
      setConnectStatus({ state: 'idle' });
      setManualMarkedConfigured(false);
      setTestStatus({ state: 'idle' });
    }
  }, [isCredentialsSaved]);

  const handleConnect = useCallback(async () => {
    setConnectStatus({ state: 'connecting' });

    try {
      const result = await configureWebhook({
        agentIdentifier: agent.identifier,
        integrationIdentifier,
      });

      if (result.success) {
        setConnectStatus({ state: 'connected' });
        onConnected();

        return;
      }

      if (result.fallbackToManual) {
        setConnectStatus({
          state: 'manual_fallback',
          message:
            result.reason?.message ??
            "We couldn't finish the setup automatically. Configure the webhook manually in Meta below.",
        });

        return;
      }

      setConnectStatus({
        state: 'error',
        message: result.reason?.message ?? "Meta didn't accept the webhook subscription.",
      });
    } catch (err) {
      setConnectStatus({
        state: 'error',
        message: err instanceof Error ? err.message : 'Something went wrong contacting Meta.',
      });
    }
  }, [agent.identifier, configureWebhook, integrationIdentifier, onConnected]);

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

      const result = await sendTestTemplate({
        agentIdentifier: agent.identifier,
        integrationIdentifier,
        subscriberId: connectSubscriberId,
      });

      if (result.success) {
        setTestStatus({ state: 'sent' });

        return;
      }

      if (result.error?.code === 'template_pending_approval') {
        setTestStatus({
          state: 'pending',
          message: result.error.message,
        });

        return;
      }

      setTestStatus({
        state: 'error',
        message: result.error?.message ?? "Meta didn't accept the test message.",
        helpUrl: result.error?.helpUrl,
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
    sendTestTemplate,
  ]);

  const connectAttemptFinished = connectStatus.state === 'connected' || connectStatus.state === 'manual_fallback';
  const showManualFallback = connectStatus.state === 'manual_fallback' && !manualMarkedConfigured;
  const showTestPanel = connectStatus.state === 'connected' || manualMarkedConfigured;

  return (
    <div className="flex w-full max-w-[400px] flex-col gap-3">
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
          {connectStatus.state === 'connecting' ? 'Connecting…' : 'Connect WhatsApp'}
        </Button>
      ) : (
        <div className="text-success-base flex items-center gap-1.5">
          <RiCheckLine className="size-4" />
          <span className="text-label-xs font-medium">
            {connectStatusLabel(connectStatus.state, manualMarkedConfigured)}
          </span>
        </div>
      )}

      {connectStatus.state === 'error' ? (
        <p className="text-error-base text-label-xs leading-4">{connectStatus.message}</p>
      ) : null}

      {showManualFallback ? (
        <ManualWebhookFallback
          message={connectStatus.message}
          webhookUrl={webhookUrl}
          verifyToken={verifyToken}
          onMarkConnected={() => {
            setManualMarkedConfigured(true);
            onConnected();
          }}
        />
      ) : null}

      {showTestPanel ? (
        <div className="border-stroke-soft mt-2 flex w-full flex-col gap-2 rounded-md border p-3">
          <p className="text-text-strong text-label-xs font-medium leading-4">Send yourself a test message</p>
          <p className="text-text-soft text-label-xs leading-4">
            {usesMetaSampleTemplate ? (
              <>
                We&rsquo;ll send a test message from your business number using a template Novu set up for you — no
                custom template setup required.
              </>
            ) : (
              <>
                We&rsquo;ll send the WhatsApp <span className="font-mono">hello_world</span> template from your business
                number to confirm everything is wired up.
              </>
            )}
          </p>
          <div className="flex items-stretch gap-2">
            <InputRoot size="xs" hasError={testStatus.state === 'error'} className="flex-1">
              <InputWrapper>
                <InputPure
                  value={phone}
                  onChange={(event) => {
                    setPhone(event.target.value);
                    if (testStatus.state === 'error' || testStatus.state === 'pending') {
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
              Sent — check your WhatsApp inbox. Reply to that message to confirm inbound delivery.
            </p>
          ) : null}
          {testStatus.state === 'pending' ? (
            <p className="text-text-soft text-label-xs leading-4">{testStatus.message}</p>
          ) : null}
          {testStatus.state === 'error' ? (
            <div className="flex flex-col gap-1.5">
              <p className="text-error-base text-label-xs leading-4">{testStatus.message}</p>
              {testStatus.helpUrl ? (
                <a
                  href={testStatus.helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-sub hover:text-text-strong text-label-xs inline-flex w-fit items-center gap-1 font-medium underline"
                >
                  Open WhatsApp dev console
                  <RiArrowRightUpLine className="size-3" />
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ManualWebhookFallback({
  message,
  webhookUrl,
  verifyToken,
  onMarkConnected,
}: {
  message: string;
  webhookUrl: string;
  verifyToken: string;
  onMarkConnected: () => void;
}) {
  return (
    <div className="border-warning-base/40 bg-warning-base/4 flex w-full flex-col gap-2 rounded-md border p-3">
      <div className="text-warning-base flex items-center gap-1.5">
        <RiErrorWarningLine className="size-4" />
        <span className="text-label-xs font-medium">{message}</span>
      </div>
      <p className="text-text-soft text-label-xs leading-4">
        In your Meta app go to <strong className="text-text-sub">WhatsApp &gt; Configuration</strong>, paste the
        Callback URL and Verify Token below, click <strong className="text-text-sub">Verify and save</strong>, then
        scroll to <strong className="text-text-sub">Webhook fields</strong>, click{' '}
        <strong className="text-text-sub">Manage</strong> and toggle{' '}
        <strong className="text-text-sub">Subscribe</strong> next to <strong className="text-text-sub">messages</strong>
        .
      </p>
      <ReadOnlyValueRow label="Callback URL" value={webhookUrl} />
      <ReadOnlyValueRow label="Verify Token" value={verifyToken} />
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

export function WhatsAppSetupGuide({
  agent,
  integrationId,
  stepOffset = 1,
  onStepsCompleted,
  embedded = false,
}: WhatsAppSetupGuideProps) {
  const { subscriberId: connectSubscriberId, isReady: isConnectSubscriberReady } = useConnectSubscriber();
  const [isCredentialsSidebarOpen, setIsCredentialsSidebarOpen] = useState(false);
  const [credentialsSavedLocally, setCredentialsSavedLocally] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [useManualCredentialsFlow, setUseManualCredentialsFlow] = useState(false);
  const isEmbeddedSignupFlagEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_WHATSAPP_EMBEDDED_SIGNUP_ENABLED, false);
  const showEmbeddedSignupFlow =
    isEmbeddedSignupFlagEnabled && isWhatsAppEmbeddedSignupConfigured() && !useManualCredentialsFlow;

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset when the watched integration changes
  useEffect(() => {
    setIsConnected(false);
    setCredentialsSavedLocally(false);
    setUseManualCredentialsFlow(false);
  }, [integrationId]);

  const handleConnected = useCallback(() => {
    setIsConnected(true);
    onStepsCompleted?.();
  }, [onStepsCompleted]);

  const handleEmbeddedSignupSuccess = useCallback(() => {
    setCredentialsSavedLocally(true);
  }, []);

  const { integrations } = useFetchIntegrations();

  const selectedIntegration = useMemo(
    () => integrations?.find((i) => i._id === integrationId && i.providerId === ChatProviderIdEnum.WhatsAppBusiness),
    [integrations, integrationId]
  );

  const selectedIntegrationIdentifier = selectedIntegration?.identifier ?? '';
  const hasCredentials = hasWhatsAppUserCredentials(selectedIntegration?.credentials);
  const isCredentialsSaved = hasCredentials || credentialsSavedLocally;
  const embeddedListeningMessage =
    isCredentialsSaved && !isConnected
      ? 'Send a message to your WhatsApp business number — we’ll confirm as soon as it arrives.'
      : 'Waiting for Meta to confirm the webhook subscription…';

  const verifyToken = (selectedIntegration?.credentials?.token as string | undefined) ?? '';
  const webhookUrl = buildAgentWebhookUrl(agent._id, selectedIntegrationIdentifier || 'YOUR_INTEGRATION_IDENTIFIER');

  const base = stepOffset;
  const completionStep = showEmbeddedSignupFlow ? base + 2 : base + 3;

  const firstIncompleteStep = useMemo(() => {
    if (isConnected) {
      return completionStep;
    }

    if (!isCredentialsSaved) {
      return showEmbeddedSignupFlow ? base : base + 1;
    }

    return showEmbeddedSignupFlow ? base + 1 : base + 2;
  }, [base, completionStep, isConnected, isCredentialsSaved, showEmbeddedSignupFlow]);

  const embeddedSignupSteps = (
    <>
      <SetupStep
        index={base}
        status={deriveStepStatus(base, firstIncompleteStep)}
        title="Connect your WhatsApp Business account"
        description={
          <span>
            {
              'Click Log in with Facebook to share your WhatsApp Business account with Novu. We’ll save your credentials and register the webhook automatically.'
            }
          </span>
        }
        rightContent={
          <div className="flex flex-col gap-2">
            {isCredentialsSaved ? (
              <div className="text-success-base flex items-center gap-1.5">
                <RiCheckLine className="size-4" />
                <span className="text-label-xs font-medium">WhatsApp Business account connected</span>
              </div>
            ) : (
              <>
                {isConnectSubscriberReady && selectedIntegrationIdentifier ? (
                  <WhatsAppEmbeddedSignupButton
                    agentIdentifier={agent.identifier}
                    integrationIdentifier={selectedIntegrationIdentifier}
                    onSuccess={handleEmbeddedSignupSuccess}
                  />
                ) : null}
                <button
                  type="button"
                  className="text-text-sub hover:text-text-strong text-label-xs w-fit font-medium underline"
                  onClick={() => setUseManualCredentialsFlow(true)}
                >
                  Enter credentials manually instead
                </button>
              </>
            )}
          </div>
        }
      />

      <SetupStep
        index={base + 1}
        status={deriveStepStatus(base + 1, firstIncompleteStep)}
        title="Send a test message"
        description={
          isCredentialsSaved
            ? 'Save your phone number, then open WhatsApp and send any message to your business number. Novu confirms the connection as soon as it arrives.'
            : 'Complete WhatsApp Embedded Signup above first, then save your phone number and send a test message.'
        }
        rightContent={
          isConnectSubscriberReady && isCredentialsSaved && selectedIntegration?.credentials ? (
            <EmbeddedSignupInboundTestPanel
              connectSubscriberId={connectSubscriberId}
              credentials={selectedIntegration.credentials}
            />
          ) : null
        }
      />
    </>
  );

  const manualSetupSteps = (
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
        title="Get your API credentials and save them in Novu"
        description={
          <span>
            {'In the left sidebar of your Meta app open '}
            <strong className="text-text-sub">Use cases</strong>
            {', click '}
            <strong className="text-text-sub">Customize</strong>
            {' on “Connect with customers through WhatsApp”, then pick '}
            <strong className="text-text-sub">API Setup</strong>
            {
              ' from the inner menu. CMD+A and CMD+C the whole page and paste it in the configure sidebar — we’ll auto-fill:'
            }
          </span>
        }
        extraContent={
          <ol className="text-text-soft text-label-xs mt-1.5 list-inside list-decimal space-y-0.5 font-medium leading-4">
            <li>
              <strong className="text-text-sub">Access Token</strong> — click &ldquo;Generate access token&rdquo; on the
              API Setup page
            </li>
            <li>
              <strong className="text-text-sub">Phone Number ID</strong> — shown under your selected phone number on the
              API Setup page
            </li>
            <li>
              <strong className="text-text-sub">WhatsApp Business Account ID</strong> — shown directly above the Phone
              Number ID on the API Setup page
            </li>
            <li>
              <strong className="text-text-sub">App Secret</strong> — lives on a different page; open{' '}
              <strong className="text-text-sub">App settings &gt; Basic</strong> from the bottom of the left sidebar,
              then copy the value next to <strong className="text-text-sub">App secret</strong> and paste it manually
            </li>
          </ol>
        }
        rightContent={
          <div className="flex flex-col gap-3">
            <SetupButton
              leadingIcon={<RiKey2Line className="size-3.5" />}
              onClick={() => setIsCredentialsSidebarOpen(true)}
            >
              {isCredentialsSaved ? 'Edit credentials' : 'Configure credentials'}
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
            {isCredentialsSaved ? (
              <p className="text-text-soft text-label-xs leading-4">
                Verify Token is auto-generated by Novu — no need to copy or paste it anywhere yourself.
              </p>
            ) : null}
          </div>
        }
      />

      <SetupStep
        index={base + 2}
        status={deriveStepStatus(base + 2, firstIncompleteStep)}
        title="Connect & test"
        description={
          isCredentialsSaved
            ? 'Click Connect WhatsApp — Novu will register the webhook with Meta and subscribe to inbound messages on your behalf.'
            : 'Save your credentials above first. Then come back here to register the webhook with Meta in one click.'
        }
        rightContent={
          isConnectSubscriberReady ? (
            <ConnectAndTestPanel
              agent={agent}
              integrationIdentifier={selectedIntegrationIdentifier}
              connectSubscriberId={connectSubscriberId}
              webhookUrl={webhookUrl}
              verifyToken={verifyToken}
              isCredentialsSaved={isCredentialsSaved && Boolean(selectedIntegrationIdentifier)}
              onConnected={handleConnected}
            />
          ) : null
        }
        extraContent={
          isConnected ? (
            <InlineToast
              className="mt-2 w-full"
              variant="tip"
              title="Heads up:"
              description="The token from API Setup expires after 24 hours. For production, swap it for a permanent System User Token in Meta Business Settings > System Users."
            />
          ) : null
        }
      />
    </>
  );

  const stepsColumn = showEmbeddedSignupFlow ? embeddedSignupSteps : manualSetupSteps;

  const listening = (
    <ListeningStatus
      agentIdentifier={agent.identifier}
      watchedIntegrationId={integrationId}
      onConnected={handleConnected}
      connectedMessage="WhatsApp is connected — your agent is ready to receive messages."
      listeningMessage={
        showEmbeddedSignupFlow ? embeddedListeningMessage : 'Waiting for Meta to confirm the webhook subscription…'
      }
    />
  );

  if (embedded) {
    return (
      <div className="flex flex-col gap-0">
        <div className={cn('relative flex flex-col gap-10 py-6 pb-3 pl-8 pr-3 md:pr-6')}>
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
          onSaveSuccess={() => setCredentialsSavedLocally(true)}
          agentOnboarding
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
        onSaveSuccess={() => setCredentialsSavedLocally(true)}
        agentOnboarding
      />
    </>
  );
}
