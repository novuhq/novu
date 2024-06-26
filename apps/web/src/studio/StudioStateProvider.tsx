import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth, useEnvironment } from '../hooks';
import type { StudioState } from './types';
import { decodeBase64 } from './utils/base64';

const StudioStateContext = React.createContext<StudioState | undefined>(undefined);

export const StudioStateProvider = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { currentUser } = useAuth();
  const { environment } = useEnvironment();

  const [state, setState] = React.useState<StudioState>(() => {
    const stateParam = new URLSearchParams(location.search).get('state');

    // Local mode
    if (stateParam) {
      return decodeBase64(stateParam);
    }

    return {
      local: false,
      storedBridgeURL: environment?.echo?.url || '',
      testUser: {
        id: currentUser?._id || '',
        emailAddress: currentUser?.email || '',
      },
    };
  });

  useEffect(() => {
    if (!state.local) {
      setState((prevState) => ({
        ...prevState,
        storedBridgeURL: environment?.echo?.url || '',
        testUser: {
          id: currentUser?._id || '',
          emailAddress: currentUser?.email || '',
        },
      }));
    }
  }, [environment, state?.local, currentUser]);

  /*
   * if (!currentUser || !environment) {
   *   return null;
   * }
   */

  return <StudioStateContext.Provider value={state}>{children}</StudioStateContext.Provider>;
};

export const useStudioState = () => {
  const value = React.useContext(StudioStateContext);
  if (!value) {
    throw new Error("The useStudioState can't be used outside the <StudioStateProvider/>.");
  }

  return value;
};
