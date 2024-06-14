import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/index';
import { ROUTES } from '../../constants/routes';

export const useSetupBridge = (url: string, setError: (error: string) => void) => {
  const navigate = useNavigate();

  const { mutate: sync, isLoading: isSyncing } = useMutation(
    (data: { bridgeUrl: string }) => api.post('/v1/echo/sync', data),
    {
      onSuccess: () => {
        navigate(ROUTES.STUDIO_ONBOARDING_PREVIEW);
      },
    }
  );
  const { isLoading, mutate } = useMutation(
    async () => {
      try {
        new URL(url);
      } catch (e) {
        throw new Error('The provided URL is invalid');
      }

      try {
        const response = await fetch(url + '?action=health-check');

        return response.json();
      } catch (e) {
        throw new Error('This is not the Novu endpoint URL');
      }
    },
    {
      onSuccess: (data) => {
        if (!data.discovered.workflows && !data.discovered.steps) {
          setError('This is not the Novu endpoint URL');

          return;
        }
        sync({
          bridgeUrl: url,
        });
      },
      onError: (e) => {
        setError((e as Error).message);
      },
    }
  );

  return {
    setup: mutate,
    loading: isLoading && isSyncing,
  };
};
