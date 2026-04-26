import { ChannelTypeEnum, EmailProviderIdEnum, providers as novuProviders } from '@novu/shared';
import { useMemo } from 'react';
import { Skeleton } from '@/components/primitives/skeleton';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchIntegrations } from '../../../hooks/use-fetch-integrations';
import { TableIntegration } from '../types';
import { IntegrationChannelGroup } from './integration-channel-group';

type IntegrationsListVariant = 'default' | 'connectSheet';

type IntegrationsListProps = {
  onItemClick: (item: TableIntegration) => void;
  excludeIntegrationIds?: string[];
  variant?: IntegrationsListVariant;
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

function ConnectSheetTileSkeleton() {
  return (
    <div className="flex min-w-0 flex-1 basis-[calc(50%-0.5rem)] flex-col gap-1.5">
      <Skeleton className="border-stroke-soft h-20 w-full rounded-lg border" />
      <Skeleton className="h-4 w-24" />
    </div>
  );
}

function IntegrationChannelGroupSkeleton({ variant }: { variant?: IntegrationsListVariant }) {
  if (variant === 'connectSheet') {
    return (
      <div className="space-y-3">
        <Skeleton className="h-3 w-24 rounded" />
        <div className="flex flex-wrap gap-4 p-1.5">
          <ConnectSheetTileSkeleton />
          <ConnectSheetTileSkeleton />
          <ConnectSheetTileSkeleton />
          <ConnectSheetTileSkeleton />
          <ConnectSheetTileSkeleton />
          <ConnectSheetTileSkeleton />
        </div>
      </div>
    );
  }

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

export function IntegrationsList({ onItemClick, excludeIntegrationIds, variant = 'default' }: IntegrationsListProps) {
  const { currentEnvironment, environments } = useEnvironment();
  const { integrations, isLoading } = useFetchIntegrations();
  const availableIntegrations = novuProviders;

  const groupedIntegrations = useMemo(() => {
    return integrations
      ?.filter((i) => i.providerId !== EmailProviderIdEnum.NovuAgent)
      .reduce(
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
      <div className={variant === 'connectSheet' ? 'space-y-4' : 'space-y-6'}>
        <IntegrationChannelGroupSkeleton variant={variant} />
        {variant === 'default' ? <IntegrationChannelGroupSkeleton variant={variant} /> : null}
      </div>
    );
  }

  return (
    <div className={variant === 'connectSheet' ? 'space-y-4' : 'space-y-6'}>
      {Object.entries(groupedIntegrations || {}).map(([channel, channelIntegrations]) => (
        <IntegrationChannelGroup
          key={channel}
          channel={channel as ChannelTypeEnum}
          integrations={channelIntegrations}
          providers={availableIntegrations}
          environments={environments}
          onItemClick={onItemClick}
          excludeIntegrationIds={excludeIntegrationIds}
          variant={variant}
        />
      ))}
    </div>
  );
}
