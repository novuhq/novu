import axios from 'axios';
import { useContext, useState, useCallback } from 'react';
import { useQuery } from 'react-query';
import { useSearchParams } from 'react-router-dom';
import { AuthContext } from '../../store/authContext';
import { errorMessage } from '../../utils/notifications';
import { vercelIntegrationSetup } from '../vercel-integration';

export function useVercelIntegration() {
  const [startSetup, setStartSetup] = useState(false);
  const { token } = useContext(AuthContext);
  const isLoggedIn = !!token;
  const isAxiosAuthorized = axios.defaults.headers.common.Authorization;

  const [params] = useSearchParams();
  const code = params.get('code');
  const next = params.get('next');
  const isFromVercel = !!(code && next);
  const { isError, isLoading, error } = useQuery<{
    success: boolean;
  }>('vercelData', () => vercelIntegrationSetup(code as string), {
    enabled: Boolean(code && next && isLoggedIn && isAxiosAuthorized && startSetup),
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
    retryOnMount: false,
    refetchInterval: false,
    onError: (err: any) => {
      if (err?.message) {
        errorMessage(err?.message);
      }
    },
    onSuccess: () => {
      if (next) {
        window.location.replace(next);
      }
    },
  });

  const startVercelSetup = useCallback(() => {
    setStartSetup(true);
  }, []);

  return {
    isError,
    isLoading,
    error,
    startVercelSetup,
    isFromVercel,
    code,
    next,
  };
}
