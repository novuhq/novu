import { useMemo } from 'react';
import { ConnectionStatus } from '../types';
import { useHealthCheck } from './useBridgeAPI';

export const useBridgeConnectionStatus = () => {
  const { data, isLoading, error, bridgeURL } = useHealthCheck();

  const status = useMemo<ConnectionStatus>(() => {
    if (isLoading) {
      return 'loading';
    }

    if (bridgeURL && !error && data?.status === 'ok') {
      return 'connected';
    }

    return 'disconnected';
  }, [bridgeURL, isLoading, data, error]);

  return {
    bridgeURL,
    status,
  };
};
