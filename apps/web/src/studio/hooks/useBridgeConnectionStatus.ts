import { errorMessage } from '@novu/design-system';
import { useQuery } from '@tanstack/react-query';
import { ConnectionStatus } from '../../components/layout/components/v2/ConnectionStatusIndicator';
import { useBridgeUrl } from './useBridgeUrl';

export type BridgeStatus = {
  status: ConnectionStatus;
  bridgeUrl?: string;
};

const BRIDGE_STATUS_REFRESH_INTERVAL_MS = 5 * 1000;

export const useBridgeConnectionStatus = () => {
  const { bridgeUrl, isLoading: isLoadingEnvironment } = useBridgeUrl();

  const { data, isLoading, refetch } = useQuery<BridgeStatus>({
    queryKey: ['bridge-status', bridgeUrl],
    // TODO: determine if we want to turn on auto-refetch
    queryFn: async () => {
      if (!bridgeUrl) {
        return { status: 'disconnected' as ConnectionStatus };
      }

      try {
        new URL(bridgeUrl);
      } catch (e) {
        const msg = `The provided URL is invalid: ${bridgeUrl}`;
        errorMessage(msg);

        return { status: 'disconnected' as ConnectionStatus, bridgeUrl };
      }

      try {
        const response = await fetch(bridgeUrl + '?action=health-check', {
          headers: {
            'Bypass-Tunnel-Reminder': 'true',
          },
        });

        const resp = await response.json();

        return { status: (resp.status === 'ok' ? 'connected' : 'disconnected') as ConnectionStatus, bridgeUrl };
      } catch (e: any) {
        return { status: 'disconnected' as ConnectionStatus, bridgeUrl };
      }
    },
  });

  return {
    data: data ?? { status: 'loading', bridgeUrl },
    isLoading: isLoading || isLoadingEnvironment,
    refetch,
  };
};
