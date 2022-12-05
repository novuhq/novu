import { useEffect, useState } from 'react';
import { useApi } from './use-api.hook';
import { useAuth } from './use-auth.hook';

export function useUnseenController() {
  const [unseenCount, setUnseenCount] = useState<number>(0);
  const { api } = useApi();
  const { token } = useAuth();

  useEffect(() => {
    if (!token || !api?.isAuthenticated) return;

    (async () => {
      const { count } = await api.getUnseenCount();

      setUnseenCount(count);
    })();
  }, [token, api?.isAuthenticated]);

  return {
    unseenCount,
    setUnseenCount,
  };
}
