import { useContext, useEffect, useState } from 'react';
import { IAuthContext } from '../index';
import { AuthContext } from '../store/auth.context';
import { useApi } from './use-api.hook';

export function useUnseenController() {
  const { api } = useApi();
  const { token } = useContext<IAuthContext>(AuthContext);
  const [unseenCount, setUnseenCount] = useState<number>(0);

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
