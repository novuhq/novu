import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useEnvironment } from '../hooks/useEnvironment';
import type { StudioState } from './types';
import { decodeBase64 } from './utils/base64';

type BridgeURLGetterSetter = { bridgeURL: string; setBridgeURL: (url: string) => void };

const StudioStateContext = React.createContext<(StudioState & BridgeURLGetterSetter) | undefined>(undefined);

function computeBridgeURL(state: StudioState) {
  return state.local ? state.localBridgeURL || state.tunnelBridgeURL : state.storedBridgeURL;
}

export const StudioStateProvider = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { currentUser, currentOrganization } = useAuth();
  const { environment } = useEnvironment();
  const [state, setState] = useState<StudioState>(() => {
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
      organizationName: currentOrganization?.name || '',
    };
  });

  const [bridgeURL, setBridgeURL] = useState(computeBridgeURL(state));

  useEffect(() => {
    if (!state.local) {
      setState({
        local: false,
        storedBridgeURL: environment?.echo?.url || '',
        testUser: {
          id: currentUser?._id || '',
          emailAddress: currentUser?.email || '',
        },
        organizationName: currentOrganization?.name || '',
      });
    }
  }, [environment, state?.local, currentUser, currentOrganization]);

  useEffect(() => {
    setBridgeURL(computeBridgeURL(state));
  }, [state]);

  const value = { ...state, bridgeURL, setBridgeURL };

  return <StudioStateContext.Provider value={value}>{children}</StudioStateContext.Provider>;
};

export const useStudioState = () => {
  const value = React.useContext(StudioStateContext);
  if (!value) {
    throw new Error("The useStudioState can't be used outside the <StudioStateProvider/>.");
  }

  return value;
};
