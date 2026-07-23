import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { retrieveChannelConnection, updateChannelConnection, verifyChannelConnection } from '@/api/channel-connections';
import { Button } from '@/components/primitives/button';
import { SecretInput } from '@/components/primitives/secret-input';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';

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
 * Novu re-establish rotation without a full OAuth reconnect.
 *
 * The refresh token is write-only — the API never echoes it back, so the input is
 * never pre-filled and is cleared after a successful save. Because Slack refresh
 * tokens are single-use, saving and verifying only happens on explicit click of
 * "Save & verify", never automatically while typing or pasting.
 */
export function SlackConnectionRefreshTokenSection({ connectionIdentifier }: { connectionIdentifier: string }) {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();
  const refreshTokenInputId = useId();
  const [refreshToken, setRefreshToken] = useState('');
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

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
      setVerifyError(null);
      setRefreshToken('');
      setIsConfiguring(false);
      queryClient.setQueryData(queryKey, verified);
      showSuccessToast('Refresh token verified — rotation active');
    },
    onError: async (error: Error) => {
      const message = error.message ?? 'Failed to verify refresh token';
      setVerifyError(message);
      showErrorToast(message);
      // The save may have persisted while the verify exchange failed (or vice versa) —
      // refetch so the displayed status always reflects the real stored state.
      await queryClient.invalidateQueries({ queryKey });
    },
  });

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

  const trimmedRefreshToken = refreshToken.trim();
  const canSave = Boolean(trimmedRefreshToken) && !mutation.isPending && !isLoading && Boolean(data?.workspace?.id);

  function handleSaveAndVerify() {
    if (!canSave) {
      return;
    }

    mutation.mutate(trimmedRefreshToken);
  }

  function handleCancelConfiguration() {
    setRefreshToken('');
    setVerifyError(null);
    setIsConfiguring(false);
  }

  const expiryHint = formatExpiry(data?.auth?.expiresAt);
  const hasRefreshToken = data?.auth?.hasRefreshToken;
  let statusHint = 'Checking refresh token status…';
  let statusHintClassName = 'text-text-soft text-paragraph-2xs';

  if (!isLoading && hasRefreshToken === true) {
    statusHint = 'Refresh token configured';
  } else if (!isLoading && hasRefreshToken === false) {
    statusHint = 'No refresh token configured yet';
  } else if (!isLoading && data) {
    statusHint = 'Refresh token status unavailable — reload after updating the API';
  }

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
          stops working, then click Save &amp; verify to exchange it.
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <span className={statusHintClassName}>{statusHint}</span>
        {expiryHint ? <span className="text-text-soft text-paragraph-2xs">{expiryHint}</span> : null}
      </div>

      {isConfiguring ? (
        <div className="flex flex-col gap-2">
          <SecretInput
            id={refreshTokenInputId}
            size="xs"
            className="font-mono"
            placeholder="xoxe-1-..."
            value={refreshToken}
            onChange={(value) => {
              setVerifyError(null);
              setRefreshToken(value);
            }}
            disabled={isLoading || mutation.isPending}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              mode="outline"
              size="xs"
              onClick={handleCancelConfiguration}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="xs"
              onClick={handleSaveAndVerify}
              disabled={!canSave}
              isLoading={mutation.isPending}
            >
              Save &amp; verify
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="secondary"
          mode="outline"
          size="xs"
          onClick={() => setIsConfiguring(true)}
          disabled={isLoading}
        >
          {hasRefreshToken ? 'Configure new refresh token' : 'Configure refresh token'}
        </Button>
      )}
    </div>
  );
}
