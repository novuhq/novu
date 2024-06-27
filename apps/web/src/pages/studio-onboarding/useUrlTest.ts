import { useMutation } from '@tanstack/react-query';
import { useStudioState } from '../../studio/StudioStateProvider';

export function useBridgeUrlTest() {
  const { bridgeURL } = useStudioState();

  const {
    isLoading,
    mutateAsync: runHealthCheck,
    data,
  } = useMutation(async () => {
    try {
      new URL(bridgeURL);
    } catch (e) {
      throw new Error('The provided URL is invalid');
    }

    try {
      const response = await fetch(bridgeURL + '?action=health-check', {
        headers: {
          'Bypass-Tunnel-Reminder': 'true',
        },
      });

      return response.json();
    } catch (e) {
      throw new Error('Novu Bridge is not available');
    }
  });

  return {
    data,
    isLoading,
    runHealthCheck,
  };
}
