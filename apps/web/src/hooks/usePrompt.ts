import { useContext, useEffect, useCallback, useState } from 'react';
import { UNSAFE_NavigationContext as NavigationContext, useLocation, useNavigate } from 'react-router-dom';

export function useBlocker(blocker, when = true) {
  const { navigator } = useContext(NavigationContext);

  useEffect(() => {
    if (!when) return;

    const unblock = (navigator as any).block((tx) => {
      const autoUnblockingTx = {
        ...tx,
        retry() {
          unblock();
          tx.retry();
        },
      };

      blocker(autoUnblockingTx);
    });

    return unblock;
  }, [navigator, blocker, when]);
}

export const usePrompt = (
  when: boolean,
  checkNextLocation = (nextLocation, location) => {
    return nextLocation.location.pathname !== location.pathname;
  }
): [boolean, () => void, () => void] => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showPrompt, setShowPrompt] = useState(false);
  const [lastLocation, setLastLocation] = useState<any>(null);
  const [confirmedNavigation, setConfirmedNavigation] = useState(false);

  const cancelNavigation = useCallback(() => {
    setShowPrompt(false);
  }, []);

  const handleBlockedNavigation = useCallback(
    (nextLocation) => {
      if (!confirmedNavigation && checkNextLocation(nextLocation, location)) {
        setShowPrompt(true);
        setLastLocation(nextLocation);

        return false;
      }

      return true;
    },
    [location, confirmedNavigation, checkNextLocation]
  );

  const confirmNavigation = useCallback(() => {
    setShowPrompt(false);
    setConfirmedNavigation(true);
  }, []);

  useEffect(() => {
    if (confirmedNavigation && lastLocation) {
      navigate(lastLocation.location.pathname);
    }
  }, [navigate, confirmedNavigation, lastLocation]);

  useBlocker(handleBlockedNavigation, when);

  return [showPrompt, confirmNavigation, cancelNavigation];
};
