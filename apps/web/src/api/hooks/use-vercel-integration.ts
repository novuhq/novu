import axios from 'axios';
import { useContext, useCallback } from 'react';
import { useMutation } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { useVercelParams } from '../../hooks/use-vercelParams';
import { AuthContext } from '../../store/authContext';
import { errorMessage } from '../../utils/notifications';
import { vercelIntegrationSetup } from '../vercel-integration';

export function useVercelIntegration() {
  const { token } = useContext(AuthContext);
  const isLoggedIn = !!token;
  const isAxiosAuthorized = axios.defaults.headers.common.Authorization;

  const { code, next, configurationId } = useVercelParams();

  const canStartSetup = Boolean(code && next && isLoggedIn && isAxiosAuthorized);

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
