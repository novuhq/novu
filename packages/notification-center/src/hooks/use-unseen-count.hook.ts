import { useContext, useEffect, useState } from 'react';
import { IAuthContext, IUnseenCount } from '../index';
import { AuthContext } from '../store/auth.context';
import { useApi } from './use-api.hook';

export function useUnseenController() {
  const { api } = useApi();
  const { token } = useContext<IAuthContext>(AuthContext);
  const [unseenCount, setUnseenCount] = useState<IUnseenCount>({
    count: 0,
    feeds: [],
  });

  useEffect(() => {
    if (!token || !api?.isAuthenticated) return;

    (async () => {
      const { count, feeds } = await api.getUnseenCount();

      setUnseenCount({ count, feeds });
    })();
  }, [token, api?.isAuthenticated]);

  return {
    unseenCount,
    setUnseenCount,
  };
}
