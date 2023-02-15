import { useEffect, useState } from 'react';
import { getInAppActivated } from '../../../api/integration';

export function useInAppActivated() {
  const [inAppInitialized, setInAppInitialized] = useState<boolean>(false);
  let intervalId: NodeJS.Timer;
  const REQUEST_INTERVAL = 3000;

  useEffect(() => {
    setInit();

    intervalId = setInterval(() => setInit(), REQUEST_INTERVAL);
  }, []);

  async function setInit() {
    const activeRes = await getInAppActivated();

    if (activeRes) {
      clearInterval(intervalId);
      setInAppInitialized(activeRes);
    }
  }

  return { initialized: inAppInitialized };
}
