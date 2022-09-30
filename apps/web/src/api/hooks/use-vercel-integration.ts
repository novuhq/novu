import axios from 'axios';
import { useContext, useState, useCallback, useEffect } from 'react';
import { useMutation } from 'react-query';
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

  const canStartSetup = Boolean(code && next && isLoggedIn && isAxiosAuthorized && startSetup);

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
    setStartSetup(true);
  }, []);

  useEffect(() => {
    const initiateSetup = () => {
      if (!canStartSetup || !code) {
        return;
      }
      mutate(code);
      setStartSetup(false);
    };

    initiateSetup();
  }, [canStartSetup, code]);

  return {
    isLoading,
    startVercelSetup,
    isFromVercel,
    code,
    next,
  };
}
