import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { RiArrowRightUpLine, RiCheckLine, RiErrorWarningLine, RiSendPlaneFill } from 'react-icons/ri';
import type { AgentResponse } from '@/api/agents';
import { patchSubscriber } from '@/api/subscribers';
import { Button } from '@/components/primitives/button';
import { InputPure, InputRoot, InputWrapper } from '@/components/primitives/input';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useConfigureWhatsAppWebhook } from '@/hooks/use-configure-whatsapp-webhook';
import { useFetchSubscriber } from '@/hooks/use-fetch-subscriber';
import { useSendWhatsAppTestTemplate } from '@/hooks/use-send-whatsapp-test-template';
import { QueryKeys } from '@/utils/query-keys';
import { ReadOnlyValueRow } from './setup-guide-primitives';
import { PHONE_PATTERN } from './whatsapp-setup-guide-utils';

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
  | { state: 'error'; message: string; helpUrl?: string };

export function ConnectAndTestPanel({
  agent,
  integrationIdentifier,
  connectSubscriberId,
  webhookUrl,
  verifyToken,
  isCredentialsSaved,
  onConnected,
}: {
  agent: AgentResponse;
  integrationIdentifier: string;
  connectSubscriberId: string;
  webhookUrl: string;
  verifyToken: string;
  isCredentialsSaved: boolean;
  onConnected: () => void;
}) {
  const [connectStatus, setConnectStatus] = useState<ConnectStatus>({ state: 'idle' });
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset UI when integration changes
  useEffect(() => {
    setConnectStatus({ state: 'idle' });
    setManualMarkedConfigured(false);
    setTestStatus({ state: 'idle' });
  }, [integrationIdentifier]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: seed phone from subscriber, reset when integration changes
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
            We&rsquo;ll send the WhatsApp <span className="font-mono">hello_world</span> template from your business
            number to confirm everything is wired up.
          </p>
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
              Sent — check your WhatsApp inbox. Reply to that message to confirm inbound delivery.
            </p>
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
