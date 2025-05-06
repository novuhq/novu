import { getBridgeHealthCheck } from '@/api/bridge';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';
import { ConnectionStatus } from '@/utils/types';
import type { HealthCheck } from '@novu/framework/internal';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

const BRIDGE_STATUS_REFRESH_INTERVAL_IN_MS = 10 * 1000;

export const useFetchBridgeHealthCheck = () => {
  const { currentEnvironment } = useEnvironment();
  const bridgeURL = currentEnvironment?.bridge?.url || '';

  const { data, isLoading, error } = useQuery<HealthCheck>({
    queryKey: [QueryKeys.bridgeHealthCheck, currentEnvironment?._id, bridgeURL],
    queryFn: () => getBridgeHealthCheck({ environment: currentEnvironment! }),
    enabled: !!bridgeURL,
    networkMode: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: BRIDGE_STATUS_REFRESH_INTERVAL_IN_MS,
    meta: {
      showError: false,
    },
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
