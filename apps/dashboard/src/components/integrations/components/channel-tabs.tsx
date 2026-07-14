import { ChannelTypeEnum, FeatureFlagsKeysEnum, IProviderConfig } from '@novu/shared';
import { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/primitives/tabs';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { CHANNEL_TYPE_TO_STRING, isChannelVisibleInUi } from '@/utils/channels';
import { INTEGRATION_CHANNELS, type IntegrationChannel } from '../utils/channels';
import { IntegrationListItem } from './integration-list-item';

type ChannelTabsProps = {
  integrationsByChannel: Record<string, IProviderConfig[]>;
  searchQuery: string;
  onIntegrationSelect: (integrationId: string) => void;
};

export function ChannelTabs({ integrationsByChannel, searchQuery, onIntegrationSelect }: ChannelTabsProps) {
  const isToolChannelEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_TOOL_CHANNEL_ENABLED);
  const channels = useMemo(
    () =>
      INTEGRATION_CHANNELS.filter((channel) =>
        isChannelVisibleInUi(channel, isToolChannelEnabled)
      ) as IntegrationChannel[],
    [isToolChannelEnabled]
  );

  return (
    <Tabs defaultValue={channels[0]} className="flex h-full flex-col">
      <TabsList variant="regular" className="bg-background sticky top-0 z-10 gap-6 border-t-0 px-3!">
        {channels.map((channel) => (
          <TabsTrigger key={channel} value={channel} variant="regular" className="px-0! py-3!" size="lg">
            {CHANNEL_TYPE_TO_STRING[channel]}
          </TabsTrigger>
        ))}
      </TabsList>

      {channels.map((channel) => (
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
