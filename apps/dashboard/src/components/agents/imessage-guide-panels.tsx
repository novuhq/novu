import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RiCheckLine, RiErrorWarningLine, RiSendPlaneFill } from 'react-icons/ri';
import { patchSubscriber } from '@/api/subscribers';
import { Button } from '@/components/primitives/button';
import { InlineToast } from '@/components/primitives/inline-toast';
import { InputPure, InputRoot, InputWrapper } from '@/components/primitives/input';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useFetchSubscriber } from '@/hooks/use-fetch-subscriber';
import { QueryKeys } from '@/utils/query-keys';
import { PHONE_PATTERN } from './whatsapp-setup-guide-utils';

type ConnectStatus =
  | { state: 'idle' }
  | { state: 'connecting' }
  | { state: 'connected' }
  | { state: 'manual_fallback'; message: string }
  | { state: 'error'; message: string };

type TestStatus =
  | { state: 'idle' }
  | { state: 'sending' }
  | { state: 'sent' }
  | { state: 'error'; message: string; code?: string };

interface ConfigureWebhookResult {
  success: boolean;
  fallbackToManual?: boolean;
  reason?: { message: string };
  existingNovuWebhookUrls?: string[];
}

interface RemoveWebhooksResult {
  success: boolean;
  message?: string;
}

export function ManualWebhookFallback({
  message,
  instructions,
  onMarkConnected,
  onOpenCredentials,
}: {
  message: string;
  instructions: ReactNode;
  onMarkConnected: () => void;
  onOpenCredentials: () => void;
}) {
  return (
    <div className="border-warning-base/40 bg-warning-base/4 flex w-full flex-col gap-2 rounded-md border p-3">
      <div className="text-warning-base flex items-center gap-1.5">
        <RiErrorWarningLine className="size-4" />
        <span className="text-label-xs font-medium">{message}</span>
      </div>
      <p className="text-text-soft text-label-xs leading-4">{instructions}</p>
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

export function StaleNovuWebhooksWarning({
  providerLabel,
  scopeNoun,
  descriptionPrefix,
  staleWebhookUrls,
  removeWebhooks,
  isRemoving,
  onRemoved,
}: {
  providerLabel: string;
  scopeNoun: 'account' | 'project';
  descriptionPrefix: string;
  staleWebhookUrls: string[];
  removeWebhooks: (webhookUrls: string[]) => Promise<RemoveWebhooksResult>;
  isRemoving: boolean;
  onRemoved: () => void;
}) {
  const handleRemove = useCallback(async () => {
    try {
      const result = await removeWebhooks(staleWebhookUrls);

      if (result.success) {
        showSuccessToast(`Removed the old Novu webhook(s) from your ${providerLabel} ${scopeNoun}.`);
        onRemoved();

        return;
      }

      showErrorToast(result.message ?? `${providerLabel} didn't accept the webhook removal.`);
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : 'Something went wrong removing the old webhook(s).');
    }
  }, [onRemoved, providerLabel, removeWebhooks, scopeNoun, staleWebhookUrls]);

  const webhookCountLabel = `${staleWebhookUrls.length} old webhook${staleWebhookUrls.length > 1 ? 's' : ''}`;

  return (
    <InlineToast
      variant="warning"
      title={`Another Novu webhook is already registered on this ${providerLabel} ${scopeNoun}.`}
      description={`${descriptionPrefix} — expect duplicate agent replies until ${webhookCountLabel} is removed.`}
      ctaLabel="Remove old webhook(s)"
      onCtaClick={handleRemove}
      isCtaLoading={isRemoving}
    />
  );
}

export function ConnectWebhookPanel({
  providerLabel,
  connectLabel,
  busyLabel,
  integrationIdentifier,
  isCredentialsSaved,
  hasWebhookSecret,
  configureWebhook,
  manualInstructions,
  existingSecretExtra,
  staleWarning,
  onConfigured,
  onOpenCredentials,
}: {
  providerLabel: string;
  connectLabel: string;
  busyLabel: string;
  integrationIdentifier: string;
  isCredentialsSaved: boolean;
  hasWebhookSecret: boolean;
  configureWebhook: (force: boolean) => Promise<ConfigureWebhookResult>;
  manualInstructions: ReactNode;
  existingSecretExtra?: ReactNode;
  staleWarning: (staleWebhookUrls: string[], onRemoved: () => void) => ReactNode;
  onConfigured: () => void;
  onOpenCredentials: () => void;
}) {
  const [connectStatus, setConnectStatus] = useState<ConnectStatus>({ state: 'idle' });
  const [manualMarkedConfigured, setManualMarkedConfigured] = useState(false);
  const [staleNovuWebhookUrls, setStaleNovuWebhookUrls] = useState<string[]>([]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset when the watched integration changes
  useEffect(() => {
    setConnectStatus({ state: 'idle' });
    setManualMarkedConfigured(false);
    setStaleNovuWebhookUrls([]);
  }, [integrationIdentifier]);

  const handleConnect = useCallback(async () => {
    setConnectStatus({ state: 'connecting' });

    try {
      const result = await configureWebhook(hasWebhookSecret);

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
            `We couldn't register the webhook automatically. Add it manually in the ${providerLabel} dashboard below.`,
        });

        return;
      }

      setConnectStatus({
        state: 'error',
        message: result.reason?.message ?? `${providerLabel} didn't accept the webhook registration.`,
      });
    } catch (err) {
      setConnectStatus({
        state: 'error',
        message: err instanceof Error ? err.message : `Something went wrong contacting ${providerLabel}.`,
      });
    }
  }, [configureWebhook, hasWebhookSecret, onConfigured, providerLabel]);

  const connectAttemptFinished = connectStatus.state === 'connected' || connectStatus.state === 'manual_fallback';
  const showManualFallback = connectStatus.state === 'manual_fallback' && !manualMarkedConfigured;
  const showExistingSecret = connectStatus.state === 'idle' && hasWebhookSecret;

  return (
    <div className="flex w-full max-w-[400px] flex-col gap-3">
      {showExistingSecret ? (
        <div className="flex flex-col gap-1">
          <div className="text-success-base flex items-center gap-1.5">
            <RiCheckLine className="size-4" />
            <span className="text-label-xs font-medium">Webhook already configured</span>
          </div>
          {existingSecretExtra}
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
          {connectStatus.state === 'connecting' ? busyLabel : showExistingSecret ? 'Reconfigure webhook' : connectLabel}
        </Button>
      ) : (
        <div className="text-success-base flex items-center gap-1.5">
          <RiCheckLine className="size-4" />
          <span className="text-label-xs font-medium">
            {manualMarkedConfigured || connectStatus.state === 'connected'
              ? 'Webhook configured: send a test message'
              : `Webhook URL ready: finish in ${providerLabel}`}
          </span>
        </div>
      )}

      {connectStatus.state === 'error' ? (
        <p className="text-error-base text-label-xs leading-4">{connectStatus.message}</p>
      ) : null}

      {showManualFallback && connectStatus.state === 'manual_fallback' ? (
        <ManualWebhookFallback
          message={connectStatus.message}
          instructions={manualInstructions}
          onOpenCredentials={onOpenCredentials}
          onMarkConnected={() => {
            setManualMarkedConfigured(true);
            onConfigured();
          }}
        />
      ) : null}

      {staleNovuWebhookUrls.length > 0 ? staleWarning(staleNovuWebhookUrls, () => setStaleNovuWebhookUrls([])) : null}
    </div>
  );
}

export function SendTestMessagePanel({
  providerLabel,
  integrationIdentifier,
  connectSubscriberId,
  sendTestMessage,
  specialErrorCode,
  renderSpecialError,
  footer,
}: {
  providerLabel: string;
  integrationIdentifier: string;
  connectSubscriberId: string;
  sendTestMessage: (subscriberId: string) => Promise<{ success: boolean; error?: { message: string; code?: string } }>;
  specialErrorCode?: string;
  renderSpecialError?: (phone: string, reset: () => void) => ReactNode;
  footer?: ReactNode;
}) {
  const [testStatus, setTestStatus] = useState<TestStatus>({ state: 'idle' });
  const [phone, setPhone] = useState('');

  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  const { data: subscriber } = useFetchSubscriber({
    subscriberId: connectSubscriberId,
    options: { enabled: Boolean(connectSubscriberId) },
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset when the watched integration changes
  useEffect(() => {
    setTestStatus({ state: 'idle' });
  }, [integrationIdentifier]);

  useEffect(() => {
    const savedPhone = subscriber?.phone?.trim();

    if (savedPhone) {
      setPhone((current) => current || savedPhone);
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

      await patchSubscriber({
        environment,
        subscriberId: connectSubscriberId,
        subscriber: { phone: phone.trim() },
      });

      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchSubscriber, environment._id, connectSubscriberId],
      });

      const result = await sendTestMessage(connectSubscriberId);

      if (result.success) {
        setTestStatus({ state: 'sent' });

        return;
      }

      setTestStatus({
        state: 'error',
        message: result.error?.message ?? `${providerLabel} didn't accept the test message.`,
        code: result.error?.code,
      });
    } catch (err) {
      setTestStatus({
        state: 'error',
        message: err instanceof Error ? err.message : 'Something went wrong sending the test message.',
      });
    }
  }, [connectSubscriberId, currentEnvironment, phone, providerLabel, queryClient, sendTestMessage]);

  const isSpecialError =
    testStatus.state === 'error' && Boolean(specialErrorCode) && testStatus.code === specialErrorCode;

  return (
    <div className="flex w-full max-w-[400px] flex-col gap-3">
      {isSpecialError && renderSpecialError ? (
        renderSpecialError(phone.trim(), () => setTestStatus({ state: 'idle' }))
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
              Sent: check your Messages app for the reply from your {providerLabel} number.
            </p>
          ) : null}
          {testStatus.state === 'error' ? (
            <p className="text-error-base text-label-xs leading-4">{testStatus.message}</p>
          ) : null}
          {footer}
        </>
      )}
    </div>
  );
}
