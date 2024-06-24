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

  async function mutate() {
    setLoading(true);

    await runHealthCheck(url);

    setTunnelUrl(url);
    setLoading(false);

    navigate(ROUTES.STUDIO_ONBOARDING_PREVIEW);
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
