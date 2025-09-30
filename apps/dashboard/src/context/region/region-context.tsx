import { apiHostnameManager } from '@/utils/api-hostname-manager';
import { ROUTES } from '@/utils/routes';
import { useClerk, useOrganization, useOrganizationList } from '@clerk/clerk-react';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

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

  // Initialize region based on URL instead of localStorage
  const [selectedRegion, setSelectedRegion] = useState<Region>(() => {
    const urlBasedRegion = detectRegionFromURL();
    console.log('Initial region detection from URL:', urlBasedRegion);
    return urlBasedRegion;
  });

  // Modal state for organization creation confirmation
  const [orgCreationModal, setOrgCreationModal] = useState<OrgCreationModalState>({
    open: false,
    targetRegion: 'us',
    previousRegion: 'us',
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
    console.log(`Manual region selection: ${previousRegion} → ${region}`);

    if (previousRegion === region) {
      console.log('Same region selected, no action needed');
      return;
    }

    setSelectedRegion(region);

    // If we're in organization creation flow, update API hostname without redirect
    if (isInOnboardingFlow()) {
      console.log('In organization creation flow, updating API hostname for new region:', region);

      // Update API and WebSocket hostnames for org creation
      const newApiHostname = getApiHostnameForRegion(region);
      const newWebSocketHostname = getWebSocketHostnameForRegion(region);
      apiHostnameManager.setApiHostname(newApiHostname);
      apiHostnameManager.setWebSocketHostname(newWebSocketHostname);

      // Clear any cached queries to ensure fresh data from new region
      queryClient.clear();

      console.log('Updated API hostname for onboarding flow without redirect');
      return;
    }

    // For region switching in dashboard - redirect to the appropriate dashboard URL
    const targetDashboardUrl = getDashboardUrlForRegion(region);
    const currentPath = window.location.pathname + window.location.search + window.location.hash;

    // Find and switch to an organization in the target region
    const targetOrgMembership = findOrganizationForRegionCallback(region);

    if (targetOrgMembership && clerk) {
      try {
        console.log(`Switching to organization "${targetOrgMembership.organization.name}" for ${region} region`);

        // Switch to the organization for the selected region
        await clerk.setActive({
          organization: targetOrgMembership.organization,
        });

        // Redirect to the correct dashboard URL for the target region
        const newUrl = `${targetDashboardUrl}${currentPath}`;
        console.log('Redirecting to:', newUrl);

        if (targetDashboardUrl !== window.location.origin) {
          window.location.href = newUrl;
        } else {
          // Same dashboard URL - just refresh to update the region
          window.location.reload();
        }
      } catch (error) {
        console.error('Failed to switch organization:', error);
        // Revert region on error
        setSelectedRegion(previousRegion);
      }
    } else {
      console.log(`No organization found for region: ${region}, showing creation confirmation`);

      // Show modal to confirm organization creation
      setOrgCreationModal({
        open: true,
        targetRegion: region,
        previousRegion: previousRegion,
      });
    }
  };

  // Auto-sync region when user switches to an organization from different region
  useEffect(() => {
    if (currentOrganization && !isInOnboardingFlow()) {
      const detectedRegion = detectRegionFromCurrentOrg();
      const urlRegion = detectRegionFromURL();

      console.log('Region detection:', {
        fromOrg: detectedRegion,
        fromURL: urlRegion,
        selected: selectedRegion,
        orgName: currentOrganization.name,
      });

      // If the URL region doesn't match the organization region,
      // redirect to the correct dashboard URL for the organization's region
      if (urlRegion !== detectedRegion) {
        console.log(
          `URL region (${urlRegion}) doesn't match organization region (${detectedRegion}) for org "${currentOrganization.name}"`
        );
        console.log(`Redirecting to ${detectedRegion} dashboard URL for current organization`);

        // Redirect to the correct dashboard URL for the organization's region
        const correctDashboardUrl = getDashboardUrlForRegion(detectedRegion);
        const currentPath = window.location.pathname + window.location.search + window.location.hash;
        const newUrl = `${correctDashboardUrl}${currentPath}`;

        console.log('Redirecting to correct region dashboard:', newUrl);

        if (correctDashboardUrl !== window.location.origin) {
          // Different dashboard URL - redirect
          window.location.href = newUrl;
        } else {
          // Same dashboard URL but wrong region state - just update the region
          setSelectedRegion(detectedRegion);
        }
      } else if (selectedRegion !== detectedRegion) {
        // URL and organization match, but our selected region state is wrong - update it
        console.log(`Updating selected region from ${selectedRegion} to ${detectedRegion} to match organization`);
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

    console.log('Updated API hostname for region:', selectedRegion, apiHostname);
  }, [selectedRegion]);

  // Handle organization creation confirmation
  const handleConfirmOrgCreation = () => {
    console.log(`Confirmed organization creation for region: ${orgCreationModal.targetRegion}`);

    // Close modal
    setOrgCreationModal({ open: false, targetRegion: 'us', previousRegion: 'us' });

    // Redirect to the correct dashboard URL for organization creation
    const targetDashboardUrl = getDashboardUrlForRegion(orgCreationModal.targetRegion);
    const orgCreationPath = ROUTES.SIGNUP_ORGANIZATION_LIST;
    const newUrl = `${targetDashboardUrl}${orgCreationPath}`;

    console.log('Redirecting to organization creation:', newUrl);

    if (targetDashboardUrl !== window.location.origin) {
      window.location.href = newUrl;
    } else {
      navigate(orgCreationPath);
    }
  };

  // Handle organization creation cancellation
  const handleCancelOrgCreation = () => {
    console.log(
      `Cancelled organization creation, reverting from ${orgCreationModal.targetRegion} back to ${orgCreationModal.previousRegion}`
    );

    // Revert region
    setSelectedRegion(orgCreationModal.previousRegion);

    // Close modal
    setOrgCreationModal({ open: false, targetRegion: 'us', previousRegion: 'us' });

    console.log(`Reverted to previous region: ${orgCreationModal.previousRegion}`);
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
