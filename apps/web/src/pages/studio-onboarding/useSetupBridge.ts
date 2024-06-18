import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/index';
import { useSegment } from '../../components/providers/SegmentProvider';
import { ROUTES } from '../../constants/routes';
import { useBridgeUrlTest } from './useUrlTest';
import { useState } from 'react';
import { setTunnelUrl } from '../../api/bridge/utils';

export const useSetupBridge = (url: string, setError: (error: string) => void) => {
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { runHealthCheck, isLoading, data } = useBridgeUrlTest();

  const { mutateAsync: syncEndpoint, isLoading: isSyncing } = useMutation(
    (params: { bridgeUrl: string }) => api.post('/v1/echo/sync', params),
    {
      onSuccess: () => {
        navigate(ROUTES.STUDIO_ONBOARDING_PREVIEW);
      },
    }
  );

  async function mutate() {
    setLoading(true);

    await runHealthCheck(url);

    await syncEndpoint({
      bridgeUrl: url,
    });

    setTunnelUrl(url);

    setLoading(false);
  }

  return {
    setup: mutate,
    testEndpoint: runHealthCheck,
    testResponse: {
      isLoading: isLoading,
      data,
    },
    loading: loading,
  };
};
