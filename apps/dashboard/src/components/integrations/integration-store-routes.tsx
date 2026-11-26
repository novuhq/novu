import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { IntegrationsListPage } from '@/pages/integrations-list-page';
import { LegacyIntegrationsListPage } from '@/pages/legacy-integrations-list-page';
import { CreateIntegrationSidebar } from './components/create-integration-sidebar';
import { UpdateIntegrationSidebar } from './components/update-integration-sidebar';
import { CreateIntegrationSidebar as LegacyCreateIntegrationSidebar } from './legacy/create-integration-sidebar';
import { UpdateIntegrationSidebar as LegacyUpdateIntegrationSidebar } from './legacy/update-integration-sidebar';

/**
 * The redesigned Integration Store is behind `IS_INTEGRATION_STORE_V_2_ENABLED`. Until it is on, the same routes
 * render the previous store from `./legacy`. Delete `./legacy`, the legacy page and this file once it is on for all.
 */
export function useIsIntegrationStoreV2Enabled() {
  return useFeatureFlag(FeatureFlagsKeysEnum.IS_INTEGRATION_STORE_V_2_ENABLED);
}

export function IntegrationStorePageRoute() {
  return useIsIntegrationStoreV2Enabled() ? <IntegrationsListPage /> : <LegacyIntegrationsListPage />;
}

export function CreateIntegrationSidebarRoute() {
  return useIsIntegrationStoreV2Enabled() ? (
    <CreateIntegrationSidebar isOpened />
  ) : (
    <LegacyCreateIntegrationSidebar isOpened />
  );
}

export function UpdateIntegrationSidebarRoute() {
  return useIsIntegrationStoreV2Enabled() ? (
    <UpdateIntegrationSidebar isOpened />
  ) : (
    <LegacyUpdateIntegrationSidebar isOpened />
  );
}
