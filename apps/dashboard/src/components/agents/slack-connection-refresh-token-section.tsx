import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { retrieveChannelConnection, updateChannelConnection, verifyChannelConnection } from '@/api/channel-connections';
import { SecretInput } from '@/components/primitives/secret-input';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

const VERIFY_DEBOUNCE_MS = 600;

function formatExpiry(expiresAt?: string): string | null {
  if (!expiresAt) {
    return null;
  }

  const expiresAtTime = new Date(expiresAt).getTime();

  if (Number.isNaN(expiresAtTime)) {
    return null;
  }

  const diffMs = expiresAtTime - Date.now();

  if (diffMs <= 0) {
    return 'Access token expired — will refresh on next send';
  }

  const hours = Math.round(diffMs / (60 * 60 * 1000));

  if (hours < 1) {
    return 'Access token expires in under an hour';
  }

  return `Access token expires in ~${hours}h`;
}

/**
 * Displays and edits the refresh token for a single Slack workspace connection.
 * Rotation is per-connection, so this reads/writes `channelConnections` directly
 * rather than the integration credentials form. Pasting a fresh refresh token lets
 * Novu re-establish rotation without a full OAuth reconnect — the value is saved and
 * verified automatically after a short debounce.
 */
export function SlackConnectionRefreshTokenSection({ connectionIdentifier }: { connectionIdentifier: string }) {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();
  const [refreshToken, setRefreshToken] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const debouncedRefreshToken = useDebouncedValue(refreshToken, VERIFY_DEBOUNCE_MS);
  // Prevents re-firing the same failed (or in-flight) token when `isPending` flips false.
  const submittedTokenRef = useRef<string | null>(null);

  const queryKey = ['channel-connection', currentEnvironment?._id, connectionIdentifier];

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: ({ signal }) =>
      retrieveChannelConnection({
        identifier: connectionIdentifier,
        environment: requireEnvironment(currentEnvironment, 'No environment selected'),
        signal,
      }),
    enabled: Boolean(currentEnvironment && connectionIdentifier),
    retry: false,
  });

  useEffect(() => {
    if (data && !isDirty) {
      setRefreshToken(data.auth?.refreshToken ?? '');
    }
  }, [data, isDirty]);

  const mutation = useMutation({
    mutationFn: async (nextRefreshToken: string) => {
      const environment = requireEnvironment(currentEnvironment, 'No environment selected');

      if (!data?.workspace?.id) {
        throw new Error('Connection is missing a workspace and cannot be updated');
      }

      await updateChannelConnection({
        identifier: connectionIdentifier,
        environment,
        workspace: data.workspace,
        auth: {
          accessToken: data.auth?.accessToken ?? '',
          refreshToken: nextRefreshToken,
        },
      });

      // Pasting a refresh token defaults its expiry to "now" server-side, so verifying
      // right away exchanges it immediately — the same path automatic pre-send refresh
      // uses — instead of only discovering a bad token on the next real send.
      return await verifyChannelConnection({
        identifier: connectionIdentifier,
        environment,
      });
    },
    onSuccess: (verified) => {
      setIsDirty(false);
      setVerifyError(null);
      setRefreshToken(verified.auth?.refreshToken ?? '');
      queryClient.setQueryData(queryKey, verified);
      showSuccessToast('Refresh token verified — rotation active');
    },
    onError: async (error: Error) => {
      const message = error.message ?? 'Failed to verify refresh token';
      setVerifyError(message);
      showErrorToast(message);
      // The save may have persisted while the verify exchange failed (or vice versa) —
      // refetch so the displayed token/expiry always reflects the real stored state.
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  useEffect(() => {
    if (!isDirty || mutation.isPending || isLoading || !data?.workspace?.id) {
      return;
    }

    const trimmed = debouncedRefreshToken.trim();
    const stored = data.auth?.refreshToken ?? '';

    if (!trimmed || trimmed === stored || trimmed === submittedTokenRef.current) {
      return;
    }

    submittedTokenRef.current = trimmed;
    mutation.mutate(trimmed);
    // Intentionally depend on the debounced value + readiness flags only — `mutation`
    // identity changes every render and would re-fire the exchange.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedRefreshToken,
    isDirty,
    isLoading,
    data?.workspace?.id,
    data?.auth?.refreshToken,
    mutation.isPending,
  ]);

  if (isError) {
    return (
      <div className="border-stroke-soft flex flex-col gap-1 border-t px-3 py-4">
        <span className="text-text-strong text-label-xs font-medium">Token rotation</span>
        <span className="text-text-soft text-paragraph-xs">
          No active workspace connection yet. Connect Slack first, then you can manage token rotation here.
        </span>
      </div>
    );
  }

  const expiryHint = formatExpiry(data?.auth?.expiresAt);
  let statusHint: string | null = expiryHint;
  let statusHintClassName = 'text-text-soft text-paragraph-2xs';

  if (mutation.isPending) {
    statusHint = 'Verifying…';
  } else if (verifyError) {
    statusHint = verifyError;
    statusHintClassName = 'text-destructive text-paragraph-2xs';
  }

  return (
    <div className="border-stroke-soft flex flex-col gap-2 border-t px-3 py-4">
      <div className="flex flex-col gap-1">
        <span className="text-text-strong text-label-xs font-medium">Token rotation</span>
        <span className="text-text-soft text-paragraph-xs">
          Used to renew the bot token before it expires. Paste a refresh token from Slack's app console if rotation
          stops working — it is verified automatically.
        </span>
      </div>

      <SecretInput
        id="slack-connection-refresh-token"
        size="xs"
        className="font-mono"
        placeholder="xoxe-1-..."
        value={refreshToken}
        onChange={(value) => {
          setIsDirty(true);
          setVerifyError(null);
          setRefreshToken(value);

          if (value.trim() !== submittedTokenRef.current) {
            submittedTokenRef.current = null;
          }
        }}
        disabled={isLoading || mutation.isPending}
      />

      {statusHint ? <span className={statusHintClassName}>{statusHint}</span> : null}
    </div>
  );
}
