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
  findOrganizationForRegion,
  getApiHostnameForRegion,
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
    // Check if we're creating an org for a specific region first
    const regionForNewOrg = localStorage.getItem('novu-region-for-new-org');
    if (regionForNewOrg === 'singapore' || regionForNewOrg === 'us') {
      return regionForNewOrg as Region;
    }

    // Otherwise, check saved preference
    const savedRegion = localStorage.getItem('novu-selected-region');
    return savedRegion === 'singapore' || savedRegion === 'us' ? (savedRegion as Region) : 'us';
  });

  // Flag to prevent conflicts between manual region selection and auto-sync
  const [isManualRegionChange, setIsManualRegionChange] = useState(false);

  // Modal state for organization creation confirmation
  const [orgCreationModal, setOrgCreationModal] = useState<OrgCreationModalState>({
    open: false,
    targetRegion: 'us',
    previousRegion: 'us',
  });

  // Flag to track if we're waiting for user decision on org creation
  const [isPendingOrgCreation, setIsPendingOrgCreation] = useState(false);

  const getApiHostname = useCallback(() => getApiHostnameForRegion(selectedRegion), [selectedRegion]);

  const detectRegionFromCurrentOrg = useCallback(
    () => detectRegionFromOrganization(currentOrganization),
    [currentOrganization]
  );

  const findOrganizationForRegionCallback = useCallback(
    (region: Region) => findOrganizationForRegion(region, userMemberships),
    [userMemberships.data]
  );

  const handleSetSelectedRegion = async (region: Region) => {
    const previousRegion = selectedRegion;
    console.log(`Manual region selection: ${previousRegion} → ${region}`);

    // Set flag to prevent auto-sync during manual change
    setIsManualRegionChange(true);
    setSelectedRegion(region);

    // If we're in organization creation flow, update everything without refresh for better UX
    if (isInOnboardingFlow()) {
      console.log('In organization creation flow, updating API hostname for new region:', region);
      localStorage.setItem('novu-selected-region', region);
      localStorage.setItem('novu-region-for-new-org', region);

      // Update API and WebSocket hostnames for org creation
      const newApiHostname = getApiHostnameForRegion(region);
      const newWebSocketHostname = getWebSocketHostnameForRegion(region);
      apiHostnameManager.setApiHostname(newApiHostname);
      apiHostnameManager.setWebSocketHostname(newWebSocketHostname);

      // Clear any cached queries to ensure fresh data from new region
      queryClient.clear();

      // Reset flags and let components re-render naturally
      setIsManualRegionChange(false);

      console.log('Updated API hostname without refresh for better UX');
      return;
    }

    // Dashboard flow - check for organizations and handle accordingly
    if (previousRegion !== region) {
      // Set region switching flag to block API calls
      apiHostnameManager.setRegionSwitching(true);
      console.log('Region switching started - blocking API calls');

      // Clear React Query caches
      queryClient.getQueryCache().clear();
      queryClient.getMutationCache().clear();

      // Update API and WebSocket hostnames first
      const newApiHostname = getApiHostnameForRegion(region);
      const newWebSocketHostname = getWebSocketHostnameForRegion(region);
      apiHostnameManager.setApiHostname(newApiHostname);
      apiHostnameManager.setWebSocketHostname(newWebSocketHostname);

      // Find and switch to an organization in the selected region
      const targetOrgMembership = findOrganizationForRegionCallback(region);

      if (targetOrgMembership && clerk) {
        try {
          console.log(`Switching to organization "${targetOrgMembership.organization.name}" for ${region} region`);

          // Update localStorage since we have a valid organization
          localStorage.setItem('novu-selected-region', region);

          // Switch to the organization for the selected region
          await clerk.setActive({
            organization: targetOrgMembership.organization,
          });

          // Immediate refresh after successful org switch
          window.location.reload();
        } catch (error) {
          console.error('Failed to switch organization:', error);
          // Reset flag on error and revert region
          apiHostnameManager.setRegionSwitching(false);
          setSelectedRegion(previousRegion);
        }
      } else {
        console.log(`No organization found for region: ${region}, showing creation confirmation`);

        // Set pending flag to prevent any automatic resets
        setIsPendingOrgCreation(true);

        // Show modal to confirm organization creation
        setOrgCreationModal({
          open: true,
          targetRegion: region,
          previousRegion: previousRegion,
        });

        // Don't reset manual change flag while modal is open - exit early
        return;
      }
    }

    // Only reset flags if we're not pending org creation decision
    if (!isPendingOrgCreation) {
      // Reset flag after a delay
      setTimeout(() => {
        if (!isPendingOrgCreation) {
          // Double check in case modal opened during timeout
          setIsManualRegionChange(false);
        }
      }, 2000);
    }
  };

  // Auto-sync region when user switches to an organization from different region
  useEffect(() => {
    if (currentOrganization) {
      // Clean up the org creation flag if we successfully have an organization
      const regionForNewOrg = localStorage.getItem('novu-region-for-new-org');
      if (regionForNewOrg) {
        console.log('Organization creation completed, cleaning up region flag');
        localStorage.removeItem('novu-region-for-new-org');

        // Reset any pending flags that might interfere with normal operation
        setIsManualRegionChange(false);
        setIsPendingOrgCreation(false);
        apiHostnameManager.setRegionSwitching(false);
      }

      // Don't auto-switch regions during onboarding flows
      if (isInOnboardingFlow()) {
        console.log('In onboarding flow, preserving current region selection:', selectedRegion);
        return;
      }

      // Don't auto-sync if we're in the middle of a manual region change
      if (isManualRegionChange) {
        console.log('Manual region change in progress, skipping auto-sync');
        return;
      }

      const detectedRegion = detectRegionFromCurrentOrg();

      // If the selected organization belongs to a different region, auto-switch
      if (detectedRegion !== selectedRegion) {
        console.log(
          `Auto-sync: Organization "${currentOrganization.name}" belongs to ${detectedRegion} region, switching from ${selectedRegion}`
        );

        // Set region switching flag to block API calls
        apiHostnameManager.setRegionSwitching(true);
        console.log('Auto region switching started - blocking API calls');

        setSelectedRegion(detectedRegion);
        localStorage.setItem('novu-selected-region', detectedRegion);

        // Clear all React Query caches immediately
        queryClient.getQueryCache().clear();
        queryClient.getMutationCache().clear();

        // Update API and WebSocket hostnames immediately
        const newApiHostname = getApiHostnameForRegion(detectedRegion);
        const newWebSocketHostname = getWebSocketHostnameForRegion(detectedRegion);
        apiHostnameManager.setApiHostname(newApiHostname);
        apiHostnameManager.setWebSocketHostname(newWebSocketHostname);

        // Immediate refresh to use new region's API
        window.location.reload();
      } else {
        console.log(`Organization "${currentOrganization.name}" matches current region: ${selectedRegion}`);
      }
    }
  }, [currentOrganization, detectRegionFromCurrentOrg, selectedRegion, isManualRegionChange, queryClient]);

  // Initialize API and WebSocket hostnames on region changes
  useEffect(() => {
    const apiHostname = getApiHostnameForRegion(selectedRegion);
    const webSocketHostname = getWebSocketHostnameForRegion(selectedRegion);
    apiHostnameManager.setApiHostname(apiHostname);
    apiHostnameManager.setWebSocketHostname(webSocketHostname);
  }, [selectedRegion]);

  // Handle organization creation confirmation
  const handleConfirmOrgCreation = () => {
    console.log(`Confirmed organization creation for region: ${orgCreationModal.targetRegion}`);

    // Store the target region for the creation flow
    localStorage.setItem('novu-region-for-new-org', orgCreationModal.targetRegion);

    // Update localStorage since we're proceeding with the new region
    localStorage.setItem('novu-selected-region', orgCreationModal.targetRegion);

    // Reset flags and close modal
    setOrgCreationModal({ open: false, targetRegion: 'us', previousRegion: 'us' });
    setIsPendingOrgCreation(false);
    setIsManualRegionChange(false);

    // Navigate to organization creation (API hostname already set to target region)
    navigate(ROUTES.SIGNUP_ORGANIZATION_LIST);
  };

  // Handle organization creation cancellation
  const handleCancelOrgCreation = () => {
    console.log(
      `Cancelled organization creation, reverting from ${orgCreationModal.targetRegion} back to ${orgCreationModal.previousRegion}`
    );

    // Revert region and localStorage to previous values
    setSelectedRegion(orgCreationModal.previousRegion);
    localStorage.setItem('novu-selected-region', orgCreationModal.previousRegion);

    // Update API and WebSocket hostnames back to previous region
    const previousApiHostname = getApiHostnameForRegion(orgCreationModal.previousRegion);
    const previousWebSocketHostname = getWebSocketHostnameForRegion(orgCreationModal.previousRegion);
    apiHostnameManager.setApiHostname(previousApiHostname);
    apiHostnameManager.setWebSocketHostname(previousWebSocketHostname);

    // Reset the region switching flag to allow API calls again
    apiHostnameManager.setRegionSwitching(false);

    // Close modal and reset all flags
    setOrgCreationModal({ open: false, targetRegion: 'us', previousRegion: 'us' });
    setIsPendingOrgCreation(false);
    setIsManualRegionChange(false);

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
