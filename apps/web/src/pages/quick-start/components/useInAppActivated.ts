import { useEffect, useState } from 'react';
import { getInAppActivated } from '../../../api/integration';

export function useInAppActivated() {
  const [inAppInitialized, setInAppInitialized] = useState<boolean>(false);
  let intervalId: NodeJS.Timer;

  useEffect(() => {
    setInit();

    intervalId = setInterval(() => setInit(), 3000);
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
