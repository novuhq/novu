import { IntegrationsListPage } from '@/pages/integrations-list-page';
import { LegacyIntegrationsListPage } from '@/pages/legacy-integrations-list-page';
import { CreateIntegrationSidebar } from './components/create-integration-sidebar';
import { UpdateIntegrationSidebar } from './components/update-integration-sidebar';
import { CreateIntegrationSidebar as LegacyCreateIntegrationSidebar } from './legacy/create-integration-sidebar';
import { UpdateIntegrationSidebar as LegacyUpdateIntegrationSidebar } from './legacy/update-integration-sidebar';
import { useIntegrationStoreVersion } from './use-integration-store-version';

/** The integration store routes render nothing until the flag is known, then the redesigned or the previous store. */
export function IntegrationStorePageRoute() {
  const version = useIntegrationStoreVersion();
  if (!version) return null;

  return version === 'v2' ? <IntegrationsListPage /> : <LegacyIntegrationsListPage />;
}

export function CreateIntegrationSidebarRoute() {
  const version = useIntegrationStoreVersion();
  if (!version) return null;

  return version === 'v2' ? <CreateIntegrationSidebar isOpened /> : <LegacyCreateIntegrationSidebar isOpened />;
}

export function UpdateIntegrationSidebarRoute() {
  const version = useIntegrationStoreVersion();
  if (!version) return null;

  return version === 'v2' ? <UpdateIntegrationSidebar isOpened /> : <LegacyUpdateIntegrationSidebar isOpened />;
}
