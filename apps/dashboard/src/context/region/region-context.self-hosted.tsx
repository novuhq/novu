import { apiHostnameManager } from '@/utils/api-hostname-manager';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { DEFAULT_REGION } from './region-config';
import { type Region, type RegionContextType } from './region-types';
import { getApiHostnameForRegion, getWebSocketHostnameForRegion } from './region-utils';

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
  const [selectedRegion] = useState<Region>(DEFAULT_REGION);

  const getApiHostname = useCallback(() => getApiHostnameForRegion(selectedRegion), [selectedRegion]);

  const handleSetSelectedRegion = async () => {
    // In self-hosted mode, region switching is not supported
    console.warn('Region switching is not available in self-hosted mode');
  };

  // Initialize API and WebSocket hostnames
  useEffect(() => {
    const apiHostname = getApiHostnameForRegion(selectedRegion);
    const webSocketHostname = getWebSocketHostnameForRegion(selectedRegion);
    apiHostnameManager.setApiHostname(apiHostname);
    apiHostnameManager.setWebSocketHostname(webSocketHostname);
  }, [selectedRegion]);

  const value: RegionContextType = {
    selectedRegion,
    setSelectedRegion: handleSetSelectedRegion,
    getApiHostname,
  };

  return <RegionContext.Provider value={value}>{children}</RegionContext.Provider>;
}

