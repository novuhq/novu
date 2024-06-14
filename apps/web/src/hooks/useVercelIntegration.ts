import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { useVercelParams } from './useVercelParams';
import { useAuth } from './useAuth';
import { errorMessage } from '../utils/notifications';
import { vercelIntegrationSetup } from '../api/vercel-integration';

export function useVercelIntegration() {
  const { currentUser } = useAuth();
  const isLoggedIn = !!currentUser;

  const { code, next, configurationId } = useVercelParams();

  const canStartSetup = Boolean(code && next && isLoggedIn);

  const navigate = useNavigate();

  const { mutate, isLoading } = useMutation(vercelIntegrationSetup, {
    onSuccess: () => {
      if (next && configurationId) {
        navigate(`/partner-integrations/vercel/link-projects?configurationId=${configurationId}&next=${next}`);
      }
    },
    onError: (err: any) => {
      if (err?.message) {
        errorMessage(err?.message);
      }
    },
  });

  const startVercelSetup = useCallback(() => {
    if (!canStartSetup || !code || !configurationId) {
      return;
    }
    mutate({ vercelIntegrationCode: code, configurationId });
  }, [canStartSetup, code, mutate, configurationId]);

  return {
    isLoading,
    startVercelSetup,
  };
}
