import { useMutation } from '@tanstack/react-query';

export function useBridgeUrlTest() {
  const {
    isLoading,
    mutateAsync: runHealthCheck,

    data,
  } = useMutation(async (url: string) => {
    try {
      new URL(url);
    } catch (e) {
      throw new Error('The provided URL is invalid');
    }

    try {
      const response = await fetch(url + '?action=health-check', {
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
