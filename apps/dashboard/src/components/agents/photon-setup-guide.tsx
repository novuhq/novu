import { ChatProviderIdEnum } from '@novu/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RiChat3Line,
  RiCheckLine,
  RiErrorWarningLine,
  RiExternalLinkLine,
  RiKey2Line,
  RiSendPlaneFill,
  RiSmartphoneLine,
} from 'react-icons/ri';
import type { AgentResponse, SendPhotonTestMessageError } from '@/api/agents';
import { patchSubscriber } from '@/api/subscribers';
import { useConnectSubscriber } from '@/components/connect/connect-subscriber-provider';
import { ProviderIcon } from '@/components/integrations/components/provider-icon';
import { Button } from '@/components/primitives/button';
import { InlineToast } from '@/components/primitives/inline-toast';
import { InputPure, InputRoot, InputWrapper } from '@/components/primitives/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useConfigurePhotonWebhook } from '@/hooks/use-configure-photon-webhook';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { useFetchSubscriber } from '@/hooks/use-fetch-subscriber';
import { usePhotonDeviceAuth } from '@/hooks/use-photon-device-auth';
import { useRegisterPhotonRecipient } from '@/hooks/use-register-photon-recipient';
import { useRemovePhotonWebhooks } from '@/hooks/use-remove-photon-webhooks';
import { useSendPhotonTestMessage } from '@/hooks/use-send-photon-test-message';
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
import { buildImessageFallbackHref, deriveStepStatus, hasPhotonProjectCredentials } from './setup-guide-step-utils';

import { PHONE_PATTERN } from './whatsapp-setup-guide-utils';

const PHOTON_DASHBOARD_URL = 'https://app.photon.codes';

export type PhotonSetupGuideProps = {
  agent: AgentResponse;
  integrationId: string;
  stepOffset?: number;
  onStepsCompleted?: () => void;
  embedded?: boolean;
};

function ConnectPhotonPanel({
  agent,
  integrationIdentifier,
  isCredentialsSaved,
  onOpenCredentials,
}: {
  agent: AgentResponse;
  integrationIdentifier: string;
  isCredentialsSaved: boolean;
  onOpenCredentials: () => void;
}) {
  const { state, connect } = usePhotonDeviceAuth({
    agentIdentifier: agent.identifier,
    integrationIdentifier,
  });

  if (isCredentialsSaved && (state.phase === 'idle' || state.phase === 'complete')) {
    return (
      <div className="flex w-full max-w-[400px] flex-col gap-2">
        <div className="text-success-base flex items-center gap-1.5">
          <RiCheckLine className="size-4" />
          <span className="text-label-xs font-medium">Photon project connected</span>
        </div>
        {state.phase === 'complete' && state.warning ? (
          <p className="text-warning-base text-label-xs leading-4">{state.warning}</p>
        ) : null}
        <button
          type="button"
          onClick={onOpenCredentials}
          className="text-text-sub hover:text-text-strong w-fit text-label-xs font-medium underline"
        >
          View project credentials in Edit credentials
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-[400px] flex-col gap-3">
      {state.phase === 'waiting' ? (
        <div className="border-information-base/40 bg-information-base/4 flex w-full flex-col gap-2 rounded-md border p-3">
          <p className="text-text-soft text-label-xs leading-4">
            Enter this code on the Photon verification page to approve the connection:
          </p>
          <span className="text-text-strong text-label-md font-semibold tracking-widest">{state.userCode}</span>
          <a
            href={state.verificationUriComplete ?? state.verificationUri}
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-sub hover:text-text-strong inline-flex w-fit items-center gap-1.5 text-label-xs font-medium underline"
          >
            <RiExternalLinkLine className="size-3.5" />
            Open Photon to approve
          </a>
          <p className="text-text-soft text-label-xs leading-4">Waiting for approval…</p>
        </div>
      ) : (
        <Button
          type="button"
          variant="primary"
          size="xs"
          className="w-fit gap-1.5 px-2 py-1.5"
          onClick={connect}
          // Also gated on the integration identifier: before useFetchIntegrations
          // resolves it is '', which would post to a URL with an empty path segment.
          disabled={!integrationIdentifier || state.phase === 'starting'}
          isLoading={state.phase === 'starting'}
        >
          {state.phase === 'starting' ? 'Connecting…' : 'Connect Photon'}
        </Button>
      )}

      {state.phase === 'denied' ? (
        <p className="text-error-base text-label-xs leading-4">The connection request was denied — try again.</p>
      ) : null}
      {state.phase === 'expired' ? (
        <p className="text-error-base text-label-xs leading-4">The connect code expired — click Connect to restart.</p>
      ) : null}
      {state.phase === 'error' ? <p className="text-error-base text-label-xs leading-4">{state.message}</p> : null}
      {state.phase === 'unavailable' ? (
        <div className="border-warning-base/40 bg-warning-base/4 flex w-full flex-col gap-2 rounded-md border p-3">
          <div className="text-warning-base flex items-center gap-1.5">
            <RiErrorWarningLine className="size-4" />
            <span className="text-label-xs font-medium">
              {state.reason ?? 'Photon connect is unavailable right now.'}
            </span>
          </div>
          <p className="text-text-soft text-label-xs leading-4">
            {'Create a project at '}
            <a
              href={PHOTON_DASHBOARD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-sub underline"
            >
              app.photon.codes
            </a>
            {', copy the '}
            <strong className="text-text-sub">Project ID</strong>
            {' and '}
            <strong className="text-text-sub">Project Secret</strong>
            {', then save them in the credentials form.'}
          </p>
        </div>
      ) : null}

      <SetupButton leadingIcon={<RiKey2Line className="size-3.5" />} onClick={onOpenCredentials}>
        {isCredentialsSaved ? 'Edit credentials' : 'Enter credentials manually'}
      </SetupButton>
    </div>
  );
}

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
        In the Photon dashboard open your project's <strong className="text-text-sub">Webhooks</strong> settings, add a
        webhook using the Callback URL from <strong className="text-text-sub">Edit credentials</strong> below, then
        paste the signing secret Photon shows you into the credentials form.
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
  const { mutateAsync: removeWebhooks, isPending } = useRemovePhotonWebhooks();

  const handleRemove = useCallback(async () => {
    try {
      const result = await removeWebhooks({ agentIdentifier, integrationIdentifier, webhookUrls: staleWebhookUrls });

      if (result.success) {
        showSuccessToast('Removed the old Novu webhook(s) from your Photon project.');
        onRemoved();

        return;
      }

      showErrorToast(result.message ?? "Photon didn't accept the webhook removal.");
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : 'Something went wrong removing the old webhook(s).');
    }
  }, [agentIdentifier, integrationIdentifier, onRemoved, removeWebhooks, staleWebhookUrls]);

  const webhookCountLabel = `${staleWebhookUrls.length} old webhook${staleWebhookUrls.length > 1 ? 's' : ''}`;

  return (
    <InlineToast
      variant="warning"
      title="Another Novu webhook is already registered on this Photon project."
      description={`Every inbound message is delivered to all of the project's webhooks — expect duplicate agent replies until ${webhookCountLabel} is removed.`}
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
  hasWebhookSecret,
  onConfigured,
  onOpenCredentials,
}: {
  agent: AgentResponse;
  integrationIdentifier: string;
  isCredentialsSaved: boolean;
  hasWebhookSecret: boolean;
  onConfigured: () => void;
  onOpenCredentials: () => void;
}) {
  const [connectStatus, setConnectStatus] = useState<ConnectStatus>({ state: 'idle' });
  const [manualMarkedConfigured, setManualMarkedConfigured] = useState(false);
  const [staleNovuWebhookUrls, setStaleNovuWebhookUrls] = useState<string[]>([]);

  const { mutateAsync: configureWebhook } = useConfigurePhotonWebhook();

  useEffect(() => {
    setConnectStatus({ state: 'idle' });
    setManualMarkedConfigured(false);
    setStaleNovuWebhookUrls([]);
  }, [integrationIdentifier]);

  const handleConnect = useCallback(async () => {
    setConnectStatus({ state: 'connecting' });

    try {
      // "Reconfigure webhook" (a secret is already stored) forces re-registration:
      // the stored secret may be stale and Photon only issues secrets at registration.
      const result = await configureWebhook({
        agentIdentifier: agent.identifier,
        integrationIdentifier,
        force: hasWebhookSecret,
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
            "We couldn't register the webhook automatically. Add it manually in the Photon dashboard below.",
        });

        return;
      }

      setConnectStatus({
        state: 'error',
        message: result.reason?.message ?? "Photon didn't accept the webhook registration.",
      });
    } catch (err) {
      setConnectStatus({
        state: 'error',
        message: err instanceof Error ? err.message : 'Something went wrong contacting Photon.',
      });
    }
  }, [agent.identifier, configureWebhook, hasWebhookSecret, integrationIdentifier, onConfigured]);

  const connectAttemptFinished = connectStatus.state === 'connected' || connectStatus.state === 'manual_fallback';
  const showManualFallback = connectStatus.state === 'manual_fallback' && !manualMarkedConfigured;
  // Detects a webhook registered in a previous session (via connect or this step).
  const showExistingSecret = connectStatus.state === 'idle' && hasWebhookSecret;

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
            ? 'Configuring…'
            : showExistingSecret
              ? 'Reconfigure webhook'
              : 'Configure webhook'}
        </Button>
      ) : (
        <div className="text-success-base flex items-center gap-1.5">
          <RiCheckLine className="size-4" />
          <span className="text-label-xs font-medium">
            {manualMarkedConfigured || connectStatus.state === 'connected'
              ? 'Webhook configured: send a test message'
              : 'Webhook URL ready: finish in Photon'}
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
  | { state: 'error'; message: string; code?: SendPhotonTestMessageError['code'] };

function RecipientNotOptedInPanel({
  agent,
  integrationIdentifier,
  phoneNumber,
  onTryAgain,
}: {
  agent: AgentResponse;
  integrationIdentifier: string;
  phoneNumber: string;
  onTryAgain: () => void;
}) {
  const [assignedPhoneNumber, setAssignedPhoneNumber] = useState('');
  const { mutateAsync: registerRecipient, isPending } = useRegisterPhotonRecipient();

  const handleRegister = useCallback(async () => {
    try {
      const result = await registerRecipient({
        agentIdentifier: agent.identifier,
        integrationIdentifier,
        phoneNumber,
      });

      if (result.success) {
        setAssignedPhoneNumber(result.assignedPhoneNumber ?? '');
        showSuccessToast('Recipient registered on your Photon line.');

        return;
      }

      showErrorToast(result.message ?? "Photon didn't accept the recipient registration.");
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : 'Something went wrong registering the recipient.');
    }
  }, [agent.identifier, integrationIdentifier, phoneNumber, registerRecipient]);

  const imessageHref = assignedPhoneNumber ? buildImessageFallbackHref(assignedPhoneNumber, agent.name) : undefined;

  return (
    <div className="border-information-base/40 bg-information-base/4 flex w-full flex-col gap-3 rounded-md border p-3">
      <div className="flex flex-col gap-2">
        <div className="text-information-base flex items-center gap-1.5">
          <RiChat3Line className="size-4" />
          <span className="text-label-xs font-medium">This recipient needs to opt in first</span>
        </div>
        <p className="text-text-soft text-label-xs leading-4">
          On Photon's shared iMessage line, a recipient must text their assigned Photon number once (or accept an
          invite) before your project can message them. Register the number to get its assigned Photon line, have the
          recipient text it, then try again. You can also send invites from{' '}
          <a href={PHOTON_DASHBOARD_URL} target="_blank" rel="noopener noreferrer" className="text-text-sub underline">
            app.photon.codes
          </a>
          .
        </p>
      </div>
      {assignedPhoneNumber ? <ReadOnlyValueRow label="Photon number" value={assignedPhoneNumber} /> : null}
      <div className="flex items-center gap-3">
        {!assignedPhoneNumber ? (
          <Button
            type="button"
            variant="secondary"
            mode="outline"
            size="xs"
            className="w-fit gap-1.5"
            onClick={handleRegister}
            disabled={isPending}
            isLoading={isPending}
          >
            Register {phoneNumber || 'this number'}
          </Button>
        ) : null}
        {imessageHref ? (
          <SetupButton href={imessageHref} leadingIcon={<RiSmartphoneLine className="size-3.5" />}>
            Message {assignedPhoneNumber}
          </SetupButton>
        ) : null}
        <button
          type="button"
          onClick={onTryAgain}
          className="text-text-sub hover:text-text-strong text-label-xs font-medium underline"
        >
          The recipient has opted in, try again
        </button>
      </div>
    </div>
  );
}

function SendTestMessagePanel({
  agent,
  integrationIdentifier,
  connectSubscriberId,
}: {
  agent: AgentResponse;
  integrationIdentifier: string;
  connectSubscriberId: string;
}) {
  const [testStatus, setTestStatus] = useState<TestStatus>({ state: 'idle' });
  const [phone, setPhone] = useState('');

  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();
  const { mutateAsync: sendTestMessage } = useSendPhotonTestMessage();

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
        message: result.error?.message ?? "Photon didn't accept the test message.",
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

  const isRecipientNotOptedIn = testStatus.state === 'error' && testStatus.code === 'recipient_not_opted_in';

  return (
    <div className="flex w-full max-w-[400px] flex-col gap-3">
      {isRecipientNotOptedIn ? (
        <RecipientNotOptedInPanel
          agent={agent}
          integrationIdentifier={integrationIdentifier}
          phoneNumber={phone.trim()}
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
              Sent: check your Messages app for the reply from your Photon number.
            </p>
          ) : null}
          {testStatus.state === 'error' ? (
            <p className="text-error-base text-label-xs leading-4">{testStatus.message}</p>
          ) : null}
        </>
      )}
    </div>
  );
}

const IMESSAGE_OTHER_PROVIDER_HINT = '__imessage_other_provider__';

function ImessageProviderSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex w-full max-w-[400px] flex-col gap-1.5">
      <span className="text-text-sub text-label-xs font-medium leading-4">iMessage provider</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger size="2xs" className="max-w-[280px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ChatProviderIdEnum.PhotonImessage}>
            <span className="flex items-center gap-2">
              <ProviderIcon
                providerId={ChatProviderIdEnum.PhotonImessage}
                providerDisplayName="Photon"
                className="size-4 shrink-0"
              />
              Photon
            </span>
          </SelectItem>
          <SelectItem value={IMESSAGE_OTHER_PROVIDER_HINT} disabled>
            Sendblue — pick it from the channel cards
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export function PhotonSetupGuide({
  agent,
  integrationId,
  stepOffset = 1,
  onStepsCompleted,
  embedded = false,
}: PhotonSetupGuideProps) {
  const { subscriberId: connectSubscriberId, isReady: isConnectSubscriberReady } = useConnectSubscriber();
  const [selectedProvider, setSelectedProvider] = useState<string>(ChatProviderIdEnum.PhotonImessage);
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
    () => integrations?.find((i) => i._id === integrationId && i.providerId === ChatProviderIdEnum.PhotonImessage),
    [integrations, integrationId]
  );

  const selectedIntegrationIdentifier = selectedIntegration?.identifier ?? '';
  const hasCredentials = hasPhotonProjectCredentials(selectedIntegration?.credentials);
  const isCredentialsSaved = hasCredentials || credentialsSavedLocally;

  // Photon issues the signing secret when the webhook is registered (connect does this
  // automatically); its presence marks the webhook step complete across sessions.
  const existingWebhookSecret =
    typeof selectedIntegration?.credentials?.token === 'string' ? selectedIntegration.credentials.token.trim() : '';
  const hasWebhookSecret = existingWebhookSecret.length > 0;
  const isWebhookConfigured = isWebhookConfiguredLocally || hasWebhookSecret;

  const base = stepOffset;

  // The provider-select step (base) is completed on mount since Photon is preselected, so the
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
        rightContent={<ImessageProviderSelect value={selectedProvider} onChange={setSelectedProvider} />}
      />

      <SetupStep
        index={base + 1}
        status={deriveStepStatus(base + 1, firstIncompleteStep)}
        title="Connect your Photon account"
        description={
          <span>
            {'Click Connect Photon and approve the request: Novu creates a Photon project for this agent and saves the '}
            <strong className="text-text-sub">Project ID</strong>
            {' and '}
            <strong className="text-text-sub">Project Secret</strong>
            {' automatically. You can also paste them manually from '}
            <a
              href={PHOTON_DASHBOARD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-sub underline"
            >
              app.photon.codes
            </a>
            {'.'}
          </span>
        }
        rightContent={
          <ConnectPhotonPanel
            agent={agent}
            integrationIdentifier={selectedIntegrationIdentifier}
            isCredentialsSaved={isCredentialsSaved}
            onOpenCredentials={() => setIsCredentialsSidebarOpen(true)}
          />
        }
      />

      <SetupStep
        index={base + 2}
        status={deriveStepStatus(base + 2, firstIncompleteStep)}
        title="Configure the inbound webhook"
        description={
          isCredentialsSaved
            ? 'Connect Photon usually registers the webhook for you. If it is not configured yet, click Configure webhook: Novu registers its inbound URL on your Photon project so incoming iMessages reach your agent.'
            : 'Connect your Photon account above first. Then come back here to register the webhook in one click.'
        }
        rightContent={
          <ConnectWebhookPanel
            agent={agent}
            integrationIdentifier={selectedIntegrationIdentifier}
            isCredentialsSaved={isCredentialsSaved && Boolean(selectedIntegrationIdentifier)}
            hasWebhookSecret={hasWebhookSecret}
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
        description="Send yourself a message from your Photon iMessage line, or text it yourself from your phone. On the shared line, the recipient must have opted in (texted the assigned number or accepted an invite) before Photon accepts outbound sends."
        rightContent={
          isConnectSubscriberReady ? (
            <SendTestMessagePanel
              agent={agent}
              integrationIdentifier={selectedIntegrationIdentifier}
              connectSubscriberId={connectSubscriberId}
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
      connectedMessage="Photon is connected: your agent is ready to receive messages."
      listeningMessage="Waiting for the first inbound message from Photon…"
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
