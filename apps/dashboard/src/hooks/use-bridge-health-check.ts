import { useQuery } from '@tanstack/react-query';
import { getBridgeHealthCheck } from '@/api/bridge';
import { BridgeStatus, ConnectionStatus } from '@/utils/types';
import { QueryKeys } from '@/utils/query-keys';
import { useMemo } from 'react';
import { useEnvironment } from '@/context/environment/hooks';

const BRIDGE_STATUS_REFRESH_INTERVAL_IN_MS = 10 * 1000;

export const useBridgeHealthCheck = () => {
  const { currentEnvironment } = useEnvironment();
  const bridgeURL = currentEnvironment?.bridge?.url || '';

  const { data, isLoading, error } = useQuery<BridgeStatus>({
    queryKey: [QueryKeys.bridgeHealthCheck, currentEnvironment?._id, bridgeURL],
    queryFn: getBridgeHealthCheck,
    enabled: !!bridgeURL,
    networkMode: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: BRIDGE_STATUS_REFRESH_INTERVAL_IN_MS,
  });

  const status = useMemo<ConnectionStatus>(() => {
    if (isLoading) {
      return ConnectionStatus.LOADING;
    }

    if (bridgeURL && !error && data?.status === 'ok') {
      return ConnectionStatus.CONNECTED;
    }

    return ConnectionStatus.DISCONNECTED;
  }, [bridgeURL, isLoading, data, error]);

  return {
    status,
    bridgeURL,
  };
};
