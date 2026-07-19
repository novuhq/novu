import { IProviderConfig } from '@novu/shared';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/primitives/tabs';
import { CHANNEL_TYPE_TO_STRING } from '@/utils/channels';
import { INTEGRATION_CHANNELS } from '../utils/channels';
import { IntegrationListItem } from './integration-list-item';

type ChannelTabsProps = {
  integrationsByChannel: Record<string, IProviderConfig[]>;
  searchQuery: string;
  onIntegrationSelect: (integrationId: string) => void;
};

export function ChannelTabs({ integrationsByChannel, searchQuery, onIntegrationSelect }: ChannelTabsProps) {
  const isSearching = searchQuery.trim().length > 0;

  if (isSearching) {
    return (
      <CrossChannelSearchResults
        integrationsByChannel={integrationsByChannel}
        onIntegrationSelect={onIntegrationSelect}
      />
    );
  }

  return (
    <Tabs defaultValue={INTEGRATION_CHANNELS[0]} className="flex h-full flex-col">
      <TabsList variant="regular" className="bg-background sticky top-0 z-10 gap-6 border-t-0 px-3!">
        {INTEGRATION_CHANNELS.map((channel) => (
          <TabsTrigger key={channel} value={channel} variant="regular" className="px-0! py-3!" size="lg">
            {CHANNEL_TYPE_TO_STRING[channel]}
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
    </Tabs>
  );
}

function CrossChannelSearchResults({
  integrationsByChannel,
  onIntegrationSelect,
}: {
  integrationsByChannel: Record<string, IProviderConfig[]>;
  onIntegrationSelect: (integrationId: string) => void;
}) {
  const channelsWithMatches = INTEGRATION_CHANNELS.filter(
    (channel) => integrationsByChannel[channel]?.length > 0
  );

  if (channelsWithMatches.length === 0) {
    return (
      <div className="text-muted-foreground flex min-h-[200px] items-center justify-center text-center p-3">
        <p>No integrations match your search</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-3">
      {channelsWithMatches.map((channel) => (
        <div key={channel} className="flex flex-col gap-2">
          <h3 className="text-text-soft text-[11px] font-semibold uppercase tracking-wider">
            {CHANNEL_TYPE_TO_STRING[channel]}
          </h3>
          <div className="flex flex-col gap-2">
            {integrationsByChannel[channel].map((integration) => (
              <IntegrationListItem
                key={integration.id}
                integration={integration}
                onClick={() => onIntegrationSelect(integration.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
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
