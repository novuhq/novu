import { ChannelTypeEnum, providers as novuProviders } from '@novu/shared';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchIntegrations } from '../../../hooks/use-fetch-integrations';
import { TableIntegration } from '../types';
import { IntegrationChannelGroup } from './integration-channel-group';
import { Skeleton } from '@/components/primitives/skeleton';
import { useMemo } from 'react';

type IntegrationsListProps = {
  onItemClick: (item: TableIntegration) => void;
};

function IntegrationCardSkeleton() {
  return (
    <div className="bg-card shadow-xs group relative flex min-h-[125px] cursor-pointer flex-col gap-2 overflow-hidden rounded-xl border border-neutral-100 p-3 transition-all hover:shadow-lg">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-1.5">
          <div className="relative h-6 w-6">
            <Skeleton className="h-full w-full rounded-lg" />
          </div>
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-4 w-4" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-[16px] w-16 rounded-sm" />
      </div>
      <div className="mt-auto flex items-center gap-2">
        <Skeleton className="h-[26px] w-24" />
        <Skeleton className="h-[26px] w-24" />
      </div>
    </div>
  );
}

function IntegrationChannelGroupSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <IntegrationCardSkeleton />
        <IntegrationCardSkeleton />
        <IntegrationCardSkeleton />
        <IntegrationCardSkeleton />
      </div>
    </div>
  );
}

export function IntegrationsList({ onItemClick }: IntegrationsListProps) {
  const { currentEnvironment, environments } = useEnvironment();
  const { integrations, isLoading } = useFetchIntegrations();
  const availableIntegrations = novuProviders;

  const groupedIntegrations = useMemo(() => {
    return integrations?.reduce(
      (acc, integration) => {
        const channel = integration.channel;

        if (!acc[channel]) {
          acc[channel] = [];
        }

        acc[channel].push(integration);

        return acc;
      },
      {} as Record<ChannelTypeEnum, typeof integrations>
    );
  }, [integrations]);

  if (isLoading || !currentEnvironment) {
    return (
      <div className="space-y-6">
        <IntegrationChannelGroupSkeleton />
        <IntegrationChannelGroupSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedIntegrations || {}).map(([channel, channelIntegrations]) => (
        <IntegrationChannelGroup
          key={channel}
          channel={channel as ChannelTypeEnum}
          integrations={channelIntegrations}
          providers={availableIntegrations}
          environments={environments}
          onItemClick={onItemClick}
        />
      ))}
    </div>
  );
}
