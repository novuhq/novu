import { IActionProviderConfig, IProviderConfig } from '@novu/shared';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/primitives/tabs';
import { INTEGRATION_CATEGORY_TO_STRING } from '@/utils/channels';
import { INTEGRATION_ACTIONS, INTEGRATION_CHANNELS } from '../utils/channels';
import { IntegrationListItem } from './integration-list-item';

type ChannelTabsProps = {
  integrationsByChannel: Record<string, IProviderConfig[]>;
  actionProvidersByCategory?: Record<string, IActionProviderConfig[]>;
  searchQuery: string;
  onIntegrationSelect: (integrationId: string) => void;
};

export function ChannelTabs({
  integrationsByChannel,
  actionProvidersByCategory = {},
  searchQuery,
  onIntegrationSelect,
}: ChannelTabsProps) {
  return (
    <Tabs defaultValue={INTEGRATION_CHANNELS[0]} className="flex h-full flex-col">
      <TabsList variant="regular" className="bg-background sticky top-0 z-10 gap-6 border-t-0 px-3!">
        {INTEGRATION_CHANNELS.map((channel) => (
          <TabsTrigger key={channel} value={channel} variant="regular" className="px-0! py-3!" size="lg">
            {INTEGRATION_CATEGORY_TO_STRING[channel]}
          </TabsTrigger>
        ))}
        {INTEGRATION_ACTIONS.map((action) => (
          <TabsTrigger key={action} value={action} variant="regular" className="px-0! py-3!" size="lg">
            {INTEGRATION_CATEGORY_TO_STRING[action]}
          </TabsTrigger>
        ))}
      </TabsList>

      {INTEGRATION_CHANNELS.map((channel) => (
        <TabsContent key={channel} value={channel} className="flex-1">
          {integrationsByChannel[channel]?.length > 0 ? (
            <div className="flex flex-col gap-4 p-3">
              {integrationsByChannel[channel].map((integration) => (
                <IntegrationListItem
                  key={integration.id}
                  integration={integration}
                  onClick={() => onIntegrationSelect(integration.id)}
                />
              ))}
            </div>
          ) : (
            <EmptyState channel={channel} searchQuery={searchQuery} />
          )}
        </TabsContent>
      ))}

      {INTEGRATION_ACTIONS.map((action) => (
        <TabsContent key={action} value={action} className="flex-1">
          {actionProvidersByCategory[action]?.length > 0 ? (
            <div className="flex flex-col gap-4 p-3">
              {actionProvidersByCategory[action].map((provider) => (
                <IntegrationListItem
                  key={provider.id}
                  integration={provider as unknown as IProviderConfig}
                  onClick={() => onIntegrationSelect(provider.id)}
                />
              ))}
            </div>
          ) : (
            <EmptyState channel={action} searchQuery={searchQuery} />
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}

function EmptyState({ channel, searchQuery }: { channel: string; searchQuery: string }) {
  return (
    <div className="text-muted-foreground flex min-h-[200px] items-center justify-center text-center">
      {searchQuery ? (
        <p>No {channel.toLowerCase()} integrations match your search</p>
      ) : (
        <p>No {channel.toLowerCase()} integrations available</p>
      )}
    </div>
  );
}
