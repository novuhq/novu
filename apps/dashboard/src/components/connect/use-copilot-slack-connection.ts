import { useNovu } from '@novu/react';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { NOVU_COPILOT_SLACK_INTEGRATION_IDENTIFIER } from '@/config';
import { useEnvironment } from '@/context/environment/hooks';
import { useCopilotConnectContext } from './copilot-connect-context';

const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 120_000;
const SLACK_USER_ENDPOINT_TYPE = 'slack_user';

type CopilotConnectionStatus = {
  isWorkspaceConnected: boolean;
  workspaceName?: string;
  connectedAt?: string;
  isUserLinked: boolean;
};

export type CopilotSlackConnection = {
  integrationIdentifier: string;
  connectionIdentifier: string;
  isWorkspaceConnected: boolean;
  isWorkspaceLoading: boolean;
  workspaceName?: string;
  connectedAt?: string;
  isUserLinked: boolean;
  isUserLinkLoading: boolean;
  isConnecting: boolean;
  isLinking: boolean;
  isDisconnecting: boolean;
  isUnlinking: boolean;
  connectWorkspace: () => Promise<void>;
  linkUser: () => Promise<void>;
  disconnectWorkspace: () => Promise<void>;
  unlinkUser: () => Promise<void>;
};

type UseCopilotSlackConnectionOptions = {
  organizationId: string;
  onError?: (error: unknown) => void;
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Drives the Novu-hosted NovuCopilot Slack connect flow for a single organization.
 *
 * Both connection *state* and the connect/link *actions* run against the Novu-prod-scoped
 * `useNovu()` instance provided by `CopilotConnectProvider` (the hosted subscriber + server-minted
 * tenant `context`/`contextHash`), so this hook must be used inside that provider. Workspace state
 * is read via `novu.channelConnections.get()` — the shared connection is now visible to the hosted
 * subscriber session (context-scoped) — and the per-user link is read via
 * `novu.channelEndpoints.list()`.
 *
 * - Workspace connection uses `connectionMode: 'shared'` under `novu-copilot-slack:<orgId>`.
 * - The per-user link uses `connectionMode: 'subscriber'` (`autoLinkUser`).
 */
export function useCopilotSlackConnection({
  organizationId,
  onError,
}: UseCopilotSlackConnectionOptions): CopilotSlackConnection {
  const novu = useNovu();
  const connectContext = useCopilotConnectContext();
  const { currentEnvironment } = useEnvironment();
  const integrationIdentifier = NOVU_COPILOT_SLACK_INTEGRATION_IDENTIFIER ?? '';
  const connectionIdentifier = `novu-copilot-slack:${organizationId}`;

  const fetchStatus = useCallback(async (): Promise<CopilotConnectionStatus> => {
    const connectionResult = await novu.channelConnections.get({
      identifier: connectionIdentifier,
      connectionMode: 'shared',
    });
    const connection = connectionResult.data ?? null;

    if (!connection) {
      return { isWorkspaceConnected: false, isUserLinked: false };
    }

    const endpointsResult = await novu.channelEndpoints.list({ integrationIdentifier, connectionIdentifier });
    const isUserLinked = (endpointsResult.data ?? []).some((endpoint) => endpoint.type === SLACK_USER_ENDPOINT_TYPE);

    return {
      isWorkspaceConnected: true,
      workspaceName: connection.workspace?.name,
      connectedAt: connection.createdAt,
      isUserLinked,
    };
  }, [novu, connectionIdentifier, integrationIdentifier]);

  const {
    data: status,
    isLoading: isStatusLoading,
    refetch: refetchStatus,
  } = useQuery({
    queryKey: ['copilot-slack-connection-status', currentEnvironment?._id, organizationId],
    queryFn: () => fetchStatus(),
    enabled: !!organizationId && !!integrationIdentifier,
    staleTime: 30 * 1000,
  });

  const isWorkspaceConnected = !!status?.isWorkspaceConnected;
  const isUserLinked = !!status?.isUserLinked;

  const [isConnecting, setIsConnecting] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);

  const abortRef = useRef(false);

  const pollUntil = useCallback(
    async (predicate: (fresh: CopilotConnectionStatus) => boolean) => {
      const startedAt = Date.now();
      abortRef.current = false;

      while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
        if (abortRef.current) {
          return false;
        }

        // eslint-disable-next-line no-await-in-loop
        await delay(POLL_INTERVAL_MS);

        try {
          // eslint-disable-next-line no-await-in-loop
          const fresh = await fetchStatus();
          if (predicate(fresh)) {
            return true;
          }
        } catch {
          // ignore transient errors during polling
        }
      }

      return false;
    },
    [fetchStatus]
  );

  const connectWorkspace = useCallback(async () => {
    if (!integrationIdentifier) {
      return;
    }

    setIsConnecting(true);

    try {
      const result = await novu.channelConnections.generateConnectOAuthUrl({
        integrationIdentifier,
        connectionIdentifier,
        context: connectContext?.context,
        contextHash: connectContext?.contextHash,
        connectionMode: 'shared',
        autoLinkUser: false,
      });

      if (result.error || !result.data?.url) {
        onError?.(result.error ?? new Error('OAuth URL was not returned. Please try again.'));

        return;
      }

      window.open(result.data.url, '_blank', 'noopener,noreferrer');

      const connected = await pollUntil((fresh) => fresh.isWorkspaceConnected);

      if (connected) {
        await refetchStatus();
      }
    } catch (error) {
      onError?.(error);
    } finally {
      setIsConnecting(false);
    }
  }, [
    novu,
    integrationIdentifier,
    connectionIdentifier,
    connectContext?.context,
    connectContext?.contextHash,
    onError,
    pollUntil,
    refetchStatus,
  ]);

  const linkUser = useCallback(async () => {
    if (!integrationIdentifier) {
      return;
    }

    setIsLinking(true);

    try {
      const result = await novu.channelConnections.generateConnectOAuthUrl({
        integrationIdentifier,
        connectionIdentifier,
        subscriberId: novu.subscriberId,
        context: connectContext?.context,
        contextHash: connectContext?.contextHash,
        connectionMode: 'subscriber',
        autoLinkUser: true,
      });

      if (result.error || !result.data?.url) {
        onError?.(result.error ?? new Error('OAuth URL was not returned. Please try again.'));

        return;
      }

      window.open(result.data.url, '_blank', 'noopener,noreferrer');

      const linked = await pollUntil((fresh) => fresh.isUserLinked);

      if (linked) {
        await refetchStatus();
      }
    } catch (error) {
      onError?.(error);
    } finally {
      setIsLinking(false);
    }
  }, [
    novu,
    integrationIdentifier,
    connectionIdentifier,
    connectContext?.context,
    connectContext?.contextHash,
    onError,
    pollUntil,
    refetchStatus,
  ]);

  const disconnectWorkspace = useCallback(async () => {
    setIsDisconnecting(true);

    try {
      const result = await novu.channelConnections.delete({ identifier: connectionIdentifier });
      if (result.error) {
        onError?.(result.error);

        return;
      }

      await refetchStatus();
    } catch (error) {
      onError?.(error);
    } finally {
      setIsDisconnecting(false);
    }
  }, [novu, connectionIdentifier, onError, refetchStatus]);

  const unlinkUser = useCallback(async () => {
    if (!integrationIdentifier) {
      return;
    }

    setIsUnlinking(true);

    try {
      const list = await novu.channelEndpoints.list({ integrationIdentifier, connectionIdentifier });
      const userEndpoint = (list.data ?? []).find((endpoint) => endpoint.type === SLACK_USER_ENDPOINT_TYPE);

      if (userEndpoint) {
        const result = await novu.channelEndpoints.delete({ identifier: userEndpoint.identifier });
        if (result.error) {
          onError?.(result.error);

          return;
        }
      }

      await refetchStatus();
    } catch (error) {
      onError?.(error);
    } finally {
      setIsUnlinking(false);
    }
  }, [novu, integrationIdentifier, connectionIdentifier, onError, refetchStatus]);

  return {
    integrationIdentifier,
    connectionIdentifier,
    isWorkspaceConnected,
    isWorkspaceLoading: isStatusLoading,
    workspaceName: status?.workspaceName,
    connectedAt: status?.connectedAt,
    isUserLinked,
    isUserLinkLoading: isStatusLoading,
    isConnecting,
    isLinking,
    isDisconnecting,
    isUnlinking,
    connectWorkspace,
    linkUser,
    disconnectWorkspace,
    unlinkUser,
  };
}
