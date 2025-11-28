import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { useOrganization } from '@clerk/clerk-react';
import { useQueryClient } from '@tanstack/react-query';
import { apiHostnameManager } from '../utils/api-hostname-manager';
import { getDefaultRegion } from './region-config';
import {
  detectRegionFromOrganization,
  getApiHostnameForRegion,
  getWebSocketHostnameForRegion,
  type Region,
} from './region-utils';
import { IS_EE_AUTH_ENABLED } from '../config';

interface RegionContextType {
  selectedRegion: Region;
}

const RegionContext = createContext<RegionContextType | undefined>(undefined);

export function useRegion() {
  const context = useContext(RegionContext);
  if (!context) {
    throw new Error('useRegion must be used within a RegionProvider');
  }
  return context;
}

interface RegionProviderProps {
  children: ReactNode;
}

export function RegionProvider({ children }: RegionProviderProps) {
  const queryClient = useQueryClient();
  const { organization: currentOrganization, isLoaded } = IS_EE_AUTH_ENABLED
    ? useOrganization()
    : { organization: null, isLoaded: true };

  const [selectedRegion, setSelectedRegion] = useState<Region>(() => {
    return getDefaultRegion();
  });

  const previousRegion = useRef<Region>(getDefaultRegion());

  useEffect(() => {
    if (!IS_EE_AUTH_ENABLED) {
      return;
    }

    if (!isLoaded) {
      return;
    }

    if (currentOrganization) {
      const detectedRegion = detectRegionFromOrganization(currentOrganization);
      setSelectedRegion(detectedRegion);
    }
  }, [currentOrganization, isLoaded]);

  useEffect(() => {
    const apiHostname = getApiHostnameForRegion(selectedRegion);
    const webSocketHostname = getWebSocketHostnameForRegion(selectedRegion);
    apiHostnameManager.setApiHostname(apiHostname);
    apiHostnameManager.setWebSocketHostname(webSocketHostname);

    if (previousRegion.current !== selectedRegion && previousRegion.current !== getDefaultRegion()) {
      queryClient.clear();
    }

    previousRegion.current = selectedRegion;
  }, [selectedRegion, queryClient]);

  const value: RegionContextType = {
    selectedRegion,
  };

  return <RegionContext.Provider value={value}>{children}</RegionContext.Provider>;
}

