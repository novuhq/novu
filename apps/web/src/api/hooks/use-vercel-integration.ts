import axios from 'axios';
import { useContext, useCallback } from 'react';
import { useMutation } from 'react-query';
import { useSearchParams } from 'react-router-dom';
import { AuthContext } from '../../store/authContext';
import { errorMessage } from '../../utils/notifications';
import { vercelIntegrationSetup } from '../vercel-integration';

export function useVercelIntegration() {
  const { token } = useContext(AuthContext);
  const isLoggedIn = !!token;
  const isAxiosAuthorized = axios.defaults.headers.common.Authorization;

  const [params] = useSearchParams();
  const code = params.get('code');
  const next = params.get('next');
  const isFromVercel = !!(code && next);

  const canStartSetup = Boolean(code && next && isLoggedIn && isAxiosAuthorized);

  const { mutate, isLoading } = useMutation(vercelIntegrationSetup, {
    onSuccess: () => {
      if (next) {
        window.location.replace(next);
      }
    },
    onError: (err: any) => {
      if (err?.message) {
        errorMessage(err?.message);
      }
    },
  });

  const startVercelSetup = useCallback(() => {
    if (!canStartSetup || !code) {
      return;
    }
    mutate(code);
  }, [canStartSetup, code, mutate]);

  return {
    isLoading,
    startVercelSetup,
    isFromVercel,
    code,
    next,
  };
}
