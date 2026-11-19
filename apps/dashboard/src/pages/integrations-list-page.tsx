import { ChannelTypeEnum, FeatureFlagsKeysEnum, PermissionsEnum } from '@novu/shared';
import { useCallback, useState } from 'react';
import { RiAddLine } from 'react-icons/ri';
import { Outlet, useNavigate } from 'react-router-dom';
import { PermissionButton } from '@/components/primitives/permission-button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/primitives/tabs';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { buildRoute, ROUTES } from '@/utils/routes';
import { DashboardLayout } from '../components/dashboard-layout';
import { DataSourcesEmptyState } from '../components/integrations/components/data-sources-empty-state';
import { IntegrationSearchInput } from '../components/integrations/components/integration-search-input';
import { IntegrationsList } from '../components/integrations/components/integrations-list';
import { TableIntegration } from '../components/integrations/types';

const INTEGRATION_STORE_TABS = [
  { value: 'channels', label: 'Channels' },
  { value: 'agents-connectors', label: 'Agents & connectors' },
  { value: 'data-sources', label: 'Data sources' },
  { value: 'tools', label: 'Tools' },
] as const;

type IntegrationStoreTab = (typeof INTEGRATION_STORE_TABS)[number]['value'];

// Tool integrations live in the Tools tab; the Channels tab has every other channel.
const TOOL_CHANNELS = [ChannelTypeEnum.TOOL] as const;
const DELIVERY_CHANNELS = Object.values(ChannelTypeEnum).filter((channel) => channel !== ChannelTypeEnum.TOOL);
const TABS_WITH_CONTENT: readonly IntegrationStoreTab[] = ['channels', 'data-sources', 'tools'];

export function IntegrationsListPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<IntegrationStoreTab>('channels');
  const isToolChannelEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_TOOL_CHANNEL_ENABLED);

  const onItemClick = (item: TableIntegration) => {
    navigate(buildRoute(ROUTES.INTEGRATIONS_UPDATE, { integrationId: item.integrationId }));
  };

  // From the Tools tab, the connect sheet opens on tools.
  const onAddIntegrationClickCallback = useCallback(() => {
    navigate(
      activeTab === 'tools'
        ? `${ROUTES.INTEGRATIONS_CONNECT}?channel=${ChannelTypeEnum.TOOL}`
        : ROUTES.INTEGRATIONS_CONNECT
    );
  }, [navigate, activeTab]);

  return (
    <DashboardLayout
      headerStartItems={
        <h1 className="text-foreground-950 flex items-center gap-1">
          <span>Integration Store</span>
        </h1>
      }
    >
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as IntegrationStoreTab)}
        className="-mx-2 -mt-2"
      >
        <div className="border-stroke-soft flex items-center gap-3 border-b px-3">
          <TabsList variant="regular" className="w-auto gap-6 border-0! px-3.5!">
            {INTEGRATION_STORE_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} variant="regular" size="lg" className="px-0! py-3!">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="ml-auto flex items-center gap-2">
            <IntegrationSearchInput value={searchQuery} onChange={setSearchQuery} />
            <PermissionButton
              permission={PermissionsEnum.INTEGRATION_WRITE}
              size="xs"
              variant="primary"
              mode="gradient"
              leadingIcon={RiAddLine}
              onClick={onAddIntegrationClickCallback}
            >
              Add provider
            </PermissionButton>
          </div>
        </div>
        <TabsContent value="channels" className="mt-0! p-2.5">
          <IntegrationsList
            onItemClick={onItemClick}
            searchQuery={searchQuery}
            channels={DELIVERY_CHANNELS}
            showZeroState
          />
        </TabsContent>
        <TabsContent value="data-sources" className="mt-0! p-2.5">
          <DataSourcesEmptyState />
        </TabsContent>
        {isToolChannelEnabled && (
          <TabsContent value="tools" className="mt-0! p-2.5">
            <IntegrationsList onItemClick={onItemClick} searchQuery={searchQuery} channels={TOOL_CHANNELS} />
          </TabsContent>
        )}
        {INTEGRATION_STORE_TABS.filter(
          (tab) => !TABS_WITH_CONTENT.includes(tab.value) || (tab.value === 'tools' && !isToolChannelEnabled)
        ).map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-0! p-2.5">
            <div className="text-text-soft text-paragraph-sm flex min-h-[200px] items-center justify-center">
              {tab.label} are coming soon.
            </div>
          </TabsContent>
        ))}
      </Tabs>
      <Outlet />
    </DashboardLayout>
  );
}
