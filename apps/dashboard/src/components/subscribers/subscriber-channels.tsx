import { motion } from 'motion/react';
import { RiLink, RiLinkUnlink } from 'react-icons/ri';
import { ProviderIcon } from '@/components/integrations/components/provider-icon';
import { Badge } from '@/components/primitives/badge';
import { Skeleton } from '@/components/primitives/skeleton';
import { SidebarContent } from '@/components/side-navigation/sidebar';
import { useSubscriberChannelGraph } from '@/hooks/use-subscriber-channel-graph';
import { getConnectionModeLabel, getEndpointDisplayLabel, getEndpointPrimaryValue } from '@/utils/channel-delivery';
import { itemVariants, listVariants } from '@/utils/animation';

type SubscriberChannelsProps = {
  subscriberId: string;
};

export function SubscriberChannels({ subscriberId }: SubscriberChannelsProps) {
  const { channelGraph, isPending } = useSubscriberChannelGraph(subscriberId);

  if (isPending) {
    return <SubscriberChannelsSkeleton />;
  }

  if (channelGraph.length === 0) {
    return (
      <SidebarContent>
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
          <RiLinkUnlink className="text-foreground-400 size-8" />
          <p className="text-foreground-600 text-sm">No channel connections or endpoints configured for this subscriber.</p>
        </div>
      </SidebarContent>
    );
  }

  return (
    <SidebarContent>
      <motion.div variants={listVariants} initial="hidden" animate="visible" className="flex flex-col gap-4 py-3">
        {channelGraph.map((group) => (
          <motion.div key={group.integrationIdentifier} variants={itemVariants} className="flex flex-col gap-2">
            <div className="flex items-center gap-2 px-3">
              {group.connection?.providerId && (
                <ProviderIcon
                  providerId={group.connection.providerId}
                  providerDisplayName={group.connection.providerId}
                  className="size-5"
                />
              )}
              <span className="text-foreground-950 text-sm font-medium">{group.integrationIdentifier}</span>
              {group.connection && (
                <Badge variant="light" color={group.connection.connected ? 'green' : 'orange'} className="ml-auto">
                  {group.connection.connected ? 'Connected' : 'Disconnected'}
                </Badge>
              )}
            </div>

            {group.connection && (
              <div className="bg-bg-weak mx-3 flex flex-col gap-1 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <RiLink className="text-foreground-400 size-4" />
                  <span className="text-foreground-600 text-xs">
                    {group.connection.workspace?.name ?? group.connection.workspace?.id}
                  </span>
                  <Badge variant="stroke" color="gray" className="ml-auto">
                    {getConnectionModeLabel(group.connection.connectionMode)}
                  </Badge>
                </div>
              </div>
            )}

            {group.endpoints.length > 0 && (
              <div className="mx-3 flex flex-col gap-1">
                {group.endpoints.map((ep) => (
                  <div
                    key={ep.identifier}
                    className="border-border flex items-center gap-2 rounded-md border px-3 py-2"
                  >
                    <span className="text-foreground-600 text-xs font-medium">
                      {getEndpointDisplayLabel(ep.type)}
                    </span>
                    <span className="text-foreground-950 ml-auto text-xs font-mono">
                      {getEndpointPrimaryValue(ep.type, ep.endpoint)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>
    </SidebarContent>
  );
}

function SubscriberChannelsSkeleton() {
  return (
    <SidebarContent>
      <div className="flex flex-col gap-4 py-3">
        {[1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-2 px-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="ml-auto h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-8 w-full rounded-md" />
          </div>
        ))}
      </div>
    </SidebarContent>
  );
}
