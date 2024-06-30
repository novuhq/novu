import { useMemo } from 'react';
import { ConnectionStatus } from '../types';
import { useHealthCheck } from './useBridgeAPI';

export const useBridgeConnectionStatus = () => {
  const { data, isFetching, error, bridgeURL } = useHealthCheck();

  const status = useMemo<ConnectionStatus>(() => {
    if (isFetching) {
      return 'loading';
    }

    if (bridgeURL && !error && data?.status === 'ok') {
      return 'connected';
    }

    return 'disconnected';
  }, [bridgeURL, isFetching, data, error]);

  return {
    bridgeURL,
    status,
  };
};
