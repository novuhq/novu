import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getAgentIntegrationsQueryKey,
  type PollPhotonDeviceAuthResponse,
  pollPhotonDeviceAuth,
  type StartPhotonDeviceAuthResponse,
  startPhotonDeviceAuth,
} from '@/api/agents';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';

export type PhotonDeviceAuthPhase =
  | { phase: 'idle' }
  | { phase: 'starting' }
  | { phase: 'unavailable'; reason?: string }
  | {
      phase: 'waiting';
      userCode: string;
      verificationUri: string;
      verificationUriComplete?: string;
    }
  | { phase: 'complete'; projectId?: string; warning?: string }
  | { phase: 'denied' }
  | { phase: 'expired' }
  | { phase: 'error'; message: string };

type UsePhotonDeviceAuthParams = {
  agentIdentifier: string;
  integrationIdentifier: string;
};

/**
 * Drives the Photon device-code connect flow: start → show the user code +
 * verification link → poll the Novu API (which proxies Photon and provisions
 * on approval) at the server-provided cadence, backing off on `slow_down`.
 */
export function usePhotonDeviceAuth({ agentIdentifier, integrationIdentifier }: UsePhotonDeviceAuthParams) {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();
  const [state, setState] = useState<PhotonDeviceAuthPhase>({ phase: 'idle' });
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRef = useRef(0);

  const stopPolling = useCallback(() => {
    sessionRef.current += 1;
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const invalidateIntegrations = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: getAgentIntegrationsQueryKey(currentEnvironment?._id, agentIdentifier),
    });
    queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchIntegrations, currentEnvironment?._id] });
  }, [agentIdentifier, currentEnvironment?._id, queryClient]);

  const startMutation = useMutation<StartPhotonDeviceAuthResponse, Error>({
    mutationFn: async () => {
      if (!currentEnvironment) {
        throw new Error('No environment selected');
      }

      return startPhotonDeviceAuth(currentEnvironment, agentIdentifier, integrationIdentifier);
    },
  });

  const schedulePoll = useCallback(
    (deviceCode: string, intervalSeconds: number, expiresAt: number, session: number) => {
      pollTimerRef.current = setTimeout(async () => {
        if (session !== sessionRef.current) return;

        if (Date.now() > expiresAt) {
          setState({ phase: 'expired' });

          return;
        }

        let result: PollPhotonDeviceAuthResponse;
        try {
          if (!currentEnvironment) throw new Error('No environment selected');
          result = await pollPhotonDeviceAuth(currentEnvironment, agentIdentifier, integrationIdentifier, deviceCode);
        } catch {
          // Transient network failure — keep polling.
          schedulePoll(deviceCode, intervalSeconds, expiresAt, session);

          return;
        }

        if (session !== sessionRef.current) return;

        switch (result.status) {
          case 'pending':
            schedulePoll(deviceCode, intervalSeconds, expiresAt, session);
            break;
          case 'slow_down':
            schedulePoll(deviceCode, intervalSeconds + 5, expiresAt, session);
            break;
          case 'complete':
            invalidateIntegrations();
            setState({ phase: 'complete', projectId: result.projectId, warning: result.warning });
            break;
          case 'denied':
            setState({ phase: 'denied' });
            break;
          case 'expired':
            setState({ phase: 'expired' });
            break;
          default:
            setState({ phase: 'error', message: result.error?.message ?? 'Photon connect failed — try again.' });
        }
      }, intervalSeconds * 1000);
    },
    [agentIdentifier, currentEnvironment, integrationIdentifier, invalidateIntegrations]
  );

  const connect = useCallback(async () => {
    stopPolling();
    const session = sessionRef.current;
    setState({ phase: 'starting' });

    let start: StartPhotonDeviceAuthResponse;
    try {
      start = await startMutation.mutateAsync();
    } catch (err) {
      setState({ phase: 'error', message: err instanceof Error ? err.message : 'Could not start Photon connect.' });

      return;
    }

    if (session !== sessionRef.current) return;

    if (!start.available || !start.deviceCode || !start.userCode || !start.verificationUri) {
      setState({ phase: 'unavailable', reason: start.reason });

      return;
    }

    setState({
      phase: 'waiting',
      userCode: start.userCode,
      verificationUri: start.verificationUri,
      verificationUriComplete: start.verificationUriComplete,
    });

    const expiresAt = Date.now() + (start.expiresIn ?? 1800) * 1000;
    schedulePoll(start.deviceCode, start.interval ?? 5, expiresAt, session);
  }, [schedulePoll, startMutation, stopPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setState({ phase: 'idle' });
  }, [stopPolling]);

  return { state, connect, reset, isStarting: startMutation.isPending };
}
