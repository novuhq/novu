import { useEffect, useState } from 'react';
import { getUnseenCount } from '../api/notifications';

export function useUnseenCount() {
  const [unseenCount, setUnseenCount] = useState<number>(0);

  useEffect(() => {
    (async () => {
      const countRes = (await getUnseenCount()).count;
      setUnseenCount(countRes);
    })();
  }, []);

  return {
    unseenCount,
    setUnseenCount,
  };
}
