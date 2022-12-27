import { useCallback, useEffect, useState } from 'react';
import { useApi } from './use-api.hook';
import { useAuth } from './use-auth.hook';

export function useUnseenController() {
  const [unseenCount, setUnseenCount] = useState<number>(0);
  const { api } = useApi();
  const { token } = useAuth();

  const setUnseenCountCallback = useCallback(
    (count: number) => {
      setUnseenCount(count);
      document.dispatchEvent(new CustomEvent('novu:unseen_count_changed', { detail: count }));
    },
    [setUnseenCount]
  );

  useEffect(() => {
    if (!token || !api?.isAuthenticated) return;

    (async () => {
      const { count } = await api.getUnseenCount();

      setUnseenCountCallback(count);
    })();
  }, [token, api?.isAuthenticated]);

  return {
    unseenCount,
    setUnseenCount: setUnseenCountCallback,
  };
}
