import { useContext, useEffect, useState } from 'react';
import { getUnseenCount } from '../api/notifications';
import { IAuthContext } from '../index';
import { AuthContext } from '../store/auth.context';

export function useUnseenCount() {
  const { token } = useContext<IAuthContext>(AuthContext);
  const [unseenCount, setUnseenCount] = useState<number>(0);

  useEffect(() => {
    if (!token) return null;

    (async () => {
      setTimeout(async () => {
        const countRes = (await getUnseenCount()).count;
        setUnseenCount(countRes);
      }, 100);
    })();
  }, [token]);

  return {
    unseenCount,
    setUnseenCount,
  };
}
