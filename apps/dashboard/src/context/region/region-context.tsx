import { useClerk, useOrganization, useOrganizationList } from '@clerk/clerk-react';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiHostnameManager } from '@/utils/api-hostname-manager';
import { ROUTES } from '@/utils/routes';
import { DEFAULT_REGION } from './region-config';
import { RegionModals } from './region-modals';
import { type OrgCreationModalState, type Region, type RegionContextType } from './region-types';
import {
  detectRegionFromOrganization,
  detectRegionFromURL,
  findOrganizationForRegion,
  getApiHostnameForRegion,
  getDashboardUrlForRegion,
  getWebSocketHostnameForRegion,
  isInOnboardingFlow,
} from './region-utils';

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
  const clerk = useClerk();
  const navigate = useNavigate();
  const { organization: currentOrganization } = useOrganization();
  const { userMemberships } = useOrganizationList({
    userMemberships: { infinite: true },
  });

  const [selectedRegion, setSelectedRegion] = useState<Region>(() => {
    const urlBasedRegion = detectRegionFromURL();
    return urlBasedRegion;
  });

  // Modal state for organization creation confirmation
  const [orgCreationModal, setOrgCreationModal] = useState<OrgCreationModalState>({
    open: false,
    targetRegion: DEFAULT_REGION,
    previousRegion: DEFAULT_REGION,
  });

  const getApiHostname = useCallback(() => getApiHostnameForRegion(selectedRegion), [selectedRegion]);

  const detectRegionFromCurrentOrg = useCallback(
    () => detectRegionFromOrganization(currentOrganization),
    [currentOrganization]
  );

  const findOrganizationForRegionCallback = useCallback(
    (region: Region) => findOrganizationForRegion(region, userMemberships),
    [userMemberships]
  );

  const handleSetSelectedRegion = async (region: Region) => {
    const previousRegion = selectedRegion;

    if (previousRegion === region) {
      return;
    }

    setSelectedRegion(region);

    if (isInOnboardingFlow()) {
      const targetDashboardUrl = getDashboardUrlForRegion(region);
      const currentPath = window.location.pathname + window.location.search + window.location.hash;
      const newUrl = `${targetDashboardUrl}${currentPath}`;

      if (targetDashboardUrl !== window.location.origin) {
        window.location.href = newUrl;
      } else {
        const newApiHostname = getApiHostnameForRegion(region);
        const newWebSocketHostname = getWebSocketHostnameForRegion(region);
        apiHostnameManager.setApiHostname(newApiHostname);
        apiHostnameManager.setWebSocketHostname(newWebSocketHostname);
        queryClient.clear();
      }

      return;
    }

    const targetDashboardUrl = getDashboardUrlForRegion(region);
    const currentPath = window.location.pathname + window.location.search + window.location.hash;

    // Find and switch to an organization in the target region
    const targetOrgMembership = findOrganizationForRegionCallback(region);

    if (targetOrgMembership && clerk) {
      try {
        await clerk.setActive({
          organization: targetOrgMembership.organization as Parameters<typeof clerk.setActive>[0]['organization'],
        });

        const newUrl = `${targetDashboardUrl}${currentPath}`;

        if (targetDashboardUrl !== window.location.origin) {
          window.location.href = newUrl;
        } else {
          window.location.reload();
        }
      } catch (error) {
        setSelectedRegion(previousRegion);
      }
    } else {
      setOrgCreationModal({
        open: true,
        targetRegion: region,
        previousRegion: previousRegion,
      });
    }
  };

  // Auto-sync region when user switches to an organization from different region
  useEffect(() => {
    if (currentOrganization) {
      const detectedRegion = detectRegionFromCurrentOrg();
      const urlRegion = detectRegionFromURL();
      const isInOrgCreation = isInOnboardingFlow();
      // If the URL region doesn't match the organization region,
      // redirect to the correct dashboard URL for the organization's region
      if (urlRegion !== detectedRegion) {
        // DON'T redirect during organization creation if we're creating a NEW organization
        // Only redirect if user selected an EXISTING organization
        if (isInOrgCreation) {
          // Just update the selected region state, don't redirect
          // This allows user to create org in region different from current URL
          setSelectedRegion(urlRegion);
          return;
        } else {
          const correctDashboardUrl = getDashboardUrlForRegion(detectedRegion);
          const currentPath = window.location.pathname + window.location.search + window.location.hash;
          const newUrl = `${correctDashboardUrl}${currentPath}`;

          if (correctDashboardUrl !== window.location.origin) {
            window.location.href = newUrl;
            return;
          }
        }

        setSelectedRegion(detectedRegion);
      } else if (selectedRegion !== detectedRegion) {
        setSelectedRegion(detectedRegion);
      }
    }
  }, [currentOrganization, detectRegionFromCurrentOrg, selectedRegion, findOrganizationForRegionCallback, clerk]);

  // Initialize API and WebSocket hostnames on region changes
  useEffect(() => {
    const apiHostname = getApiHostnameForRegion(selectedRegion);
    const webSocketHostname = getWebSocketHostnameForRegion(selectedRegion);
    apiHostnameManager.setApiHostname(apiHostname);
    apiHostnameManager.setWebSocketHostname(webSocketHostname);
  }, [selectedRegion]);

  // Handle organization creation confirmation
  const handleConfirmOrgCreation = () => {
    setOrgCreationModal({ open: false, targetRegion: DEFAULT_REGION, previousRegion: DEFAULT_REGION });

    const targetDashboardUrl = getDashboardUrlForRegion(orgCreationModal.targetRegion);
    const orgCreationPath = ROUTES.SIGNUP_ORGANIZATION_LIST;
    const newUrl = `${targetDashboardUrl}${orgCreationPath}`;

    if (targetDashboardUrl !== window.location.origin) {
      window.location.href = newUrl;
    } else {
      navigate(orgCreationPath);
    }
  };

  // Handle organization creation cancellation
  const handleCancelOrgCreation = () => {
    setSelectedRegion(orgCreationModal.previousRegion);
    setOrgCreationModal({ open: false, targetRegion: DEFAULT_REGION, previousRegion: DEFAULT_REGION });
  };

  const value: RegionContextType = {
    selectedRegion,
    setSelectedRegion: handleSetSelectedRegion,
    getApiHostname,
  };

  return (
    <RegionContext.Provider value={value}>
      {children}

      <RegionModals
        orgCreationModal={orgCreationModal}
        onCancelOrgCreation={handleCancelOrgCreation}
        onConfirmOrgCreation={handleConfirmOrgCreation}
      />
    </RegionContext.Provider>
  );
}
