import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import { useBridgeUrlTest } from './useUrlTest';
import { useState } from 'react';
import { useBridgeURL } from '../../studio/hooks/useBridgeURL';

export const useSetupBridge = (url: string, setError: (error: string) => void) => {
  const [loading, setLoading] = useState<boolean>(false);
  const { setBridgeUrl } = useBridgeURL();

  const navigate = useNavigate();
  const { runHealthCheck, isLoading, data } = useBridgeUrlTest();

  async function mutate() {
    setLoading(true);

    await runHealthCheck(url);

    setBridgeUrl(url);
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
