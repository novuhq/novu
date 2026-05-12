import { CredentialsKeyEnum } from '@novu/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import { type Control, useWatch } from 'react-hook-form';
import { RiCheckLine, RiErrorWarningLine, RiLoader4Line } from 'react-icons/ri';
import type { WhatsAppValidateTokenResponse } from '@/api/agents';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useValidateWhatsAppToken } from '@/hooks/use-validate-whatsapp-token';
import { cn } from '@/utils/ui';
import type { IntegrationFormData } from '../types';

const VALIDATION_DEBOUNCE_MS = 800;

type Status = 'idle' | 'loading' | 'success' | 'error';

type WhatsAppCredentialsValidatorProps = {
  control: Control<IntegrationFormData>;
};

function deriveStatus(
  isLoading: boolean,
  hasInputs: boolean,
  result: WhatsAppValidateTokenResponse | undefined,
  error: Error | null
): Status {
  if (!hasInputs) return 'idle';
  if (isLoading) return 'loading';
  if (error) return 'error';
  if (!result) return 'idle';

  return result.valid ? 'success' : 'error';
}

function formatExpiryWarning(expiresAt: number | undefined): string | null {
  if (!expiresAt) return null;
  const msUntil = expiresAt * 1000 - Date.now();
  if (msUntil <= 0) return 'This token has expired.';
  const days = Math.ceil(msUntil / (1000 * 60 * 60 * 24));
  if (days <= 7) {
    const noun = days === 1 ? 'day' : 'days';

    return `This token expires in ${days} ${noun}. Generate a System User token for production.`;
  }

  return null;
}

export function WhatsAppCredentialsValidator({ control }: WhatsAppCredentialsValidatorProps) {
  const credentials = useWatch({ control, name: 'credentials' });

  const apiToken = (credentials?.[CredentialsKeyEnum.ApiToken] ?? '').trim();
  const phoneNumberId = (credentials?.[CredentialsKeyEnum.phoneNumberIdentification] ?? '').trim();
  const businessAccountId = (credentials?.[CredentialsKeyEnum.businessAccountId] ?? '').trim();

  const debouncedToken = useDebouncedValue(apiToken, VALIDATION_DEBOUNCE_MS);
  const debouncedPhoneNumberId = useDebouncedValue(phoneNumberId, VALIDATION_DEBOUNCE_MS);
  const debouncedBusinessAccountId = useDebouncedValue(businessAccountId, VALIDATION_DEBOUNCE_MS);

  const { mutateAsync, reset } = useValidateWhatsAppToken();

  const [result, setResult] = useState<WhatsAppValidateTokenResponse | undefined>();
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const lastValidatedKey = useRef<string>('');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!debouncedToken) {
      setResult(undefined);
      setError(null);
      setIsLoading(false);
      lastValidatedKey.current = '';
      reset();
      abortRef.current?.abort();

      return;
    }

    const key = `${debouncedToken}|${debouncedPhoneNumberId}|${debouncedBusinessAccountId}`;
    if (key === lastValidatedKey.current) return;
    lastValidatedKey.current = key;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    mutateAsync({
      accessToken: debouncedToken,
      phoneNumberIdentification: debouncedPhoneNumberId || undefined,
      businessAccountId: debouncedBusinessAccountId || undefined,
      signal: controller.signal,
    })
      .then((response) => {
        if (controller.signal.aborted) return;
        setResult(response);
      })
      .catch((err: Error) => {
        if (controller.signal.aborted || err.name === 'AbortError') return;
        setError(err);
        setResult(undefined);
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [debouncedToken, debouncedPhoneNumberId, debouncedBusinessAccountId, mutateAsync, reset]);

  const status = deriveStatus(isLoading, Boolean(apiToken), result, error);
  const expiryWarning = useMemo(() => formatExpiryWarning(result?.expiresAt), [result?.expiresAt]);

  if (status === 'idle') {
    return null;
  }

  return (
    <output
      className={cn(
        'border-stroke-weak bg-bg-white mb-3 flex items-start gap-2 rounded-md border p-2',
        status === 'success' && 'border-success-base/40 bg-success-base/4',
        status === 'error' && 'border-error-base/40 bg-error-base/4'
      )}
      aria-live="polite"
    >
      <StatusIcon status={status} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Headline status={status} result={result} error={error} />
        {expiryWarning && status === 'success' ? (
          <p className="text-warning-base text-label-xs leading-4">{expiryWarning}</p>
        ) : null}
      </div>
    </output>
  );
}

function StatusIcon({ status }: { status: Status }) {
  if (status === 'loading') {
    return (
      <span className="text-text-soft mt-0.5 shrink-0">
        <RiLoader4Line className="size-4 animate-spin" />
      </span>
    );
  }

  if (status === 'success') {
    return (
      <span className="text-success-base mt-0.5 shrink-0">
        <RiCheckLine className="size-4" />
      </span>
    );
  }

  return (
    <span className="text-error-base mt-0.5 shrink-0">
      <RiErrorWarningLine className="size-4" />
    </span>
  );
}

function Headline({
  status,
  result,
  error,
}: {
  status: Status;
  result: WhatsAppValidateTokenResponse | undefined;
  error: Error | null;
}) {
  if (status === 'loading') {
    return <p className="text-text-sub text-label-xs font-medium leading-4">Checking with Meta…</p>;
  }

  if (status === 'success' && result) {
    return (
      <>
        <p className="text-text-strong text-label-xs font-medium leading-4">
          {result.verifiedName ? `Connected to ${result.verifiedName}` : 'Credentials look good'}
          {result.displayPhoneNumber ? ` (${result.displayPhoneNumber})` : ''}
        </p>
        <p className="text-text-soft text-label-xs leading-4">
          {result.wabaId
            ? 'Save and continue — Novu can register the webhook with Meta automatically.'
            : 'Save and continue to the next step.'}
        </p>
      </>
    );
  }

  const message = result?.error?.message ?? error?.message ?? 'We could not validate this token with Meta.';

  return <p className="text-error-base text-label-xs font-medium leading-4">{message}</p>;
}
