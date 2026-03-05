import {
  ActionIntegrationTypeEnum,
  actionProviders,
  ChannelTypeEnum,
  IntegrationCategoryType,
  providers as novuProviders,
} from '@novu/shared';
import { useMemo } from 'react';
import { Skeleton } from '@/components/primitives/skeleton';
import { useEnvironment } from '@/context/environment/hooks';
import { INTEGRATION_CATEGORY_TO_STRING } from '@/utils/channels';
import { useFetchIntegrations } from '../../../hooks/use-fetch-integrations';
import { TableIntegration } from '../types';
import { IntegrationChannelGroup } from './integration-channel-group';

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
        const channel = integration.channel as IntegrationCategoryType;

        if (!acc[channel]) {
          acc[channel] = [];
        }

        acc[channel].push(integration);

        return acc;
      },
      {} as Record<IntegrationCategoryType, typeof integrations>
    );
  }, [integrations]);

  const channelIntegrationEntries = useMemo(
    () =>
      Object.entries(groupedIntegrations || {}).filter(([channel]) =>
        Object.values(ChannelTypeEnum).includes(channel as ChannelTypeEnum)
      ),
    [groupedIntegrations]
  );

  const actionIntegrationEntries = useMemo(
    () =>
      Object.entries(groupedIntegrations || {}).filter(([channel]) =>
        Object.values(ActionIntegrationTypeEnum).includes(channel as ActionIntegrationTypeEnum)
      ),
    [groupedIntegrations]
  );

  if (isLoading || !currentEnvironment) {
    return (
      <div className="space-y-6">
        <IntegrationChannelGroupSkeleton />
        <IntegrationChannelGroupSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {channelIntegrationEntries.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-foreground-950 text-lg font-semibold">Channels</h2>
          {channelIntegrationEntries.map(([channel, channelIntegrations]) => (
            <IntegrationChannelGroup
              key={channel}
              channel={channel as ChannelTypeEnum}
              integrations={channelIntegrations}
              providers={availableIntegrations}
              environments={environments}
              onItemClick={onItemClick}
            />
          ))}
        </section>
      )}

      {(actionIntegrationEntries.length > 0 || actionProviders.length > 0) && (
        <section className="space-y-6">
          <h2 className="text-foreground-950 text-lg font-semibold">Actions</h2>
          {actionIntegrationEntries.length > 0 ? (
            actionIntegrationEntries.map(([category, categoryIntegrations]) => (
              <div key={category} className="space-y-4">
                <h3 className="text-foreground-700 text-md font-medium">
                  {INTEGRATION_CATEGORY_TO_STRING[category as IntegrationCategoryType]}
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {categoryIntegrations.map((integration) => {
                    const provider = actionProviders.find((p) => p.id === integration.providerId);
                    if (!provider) return null;

                    const environment = environments?.find((env) => env._id === integration._environmentId);
                    if (!environment) return null;

                    return null;
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="text-muted-foreground py-4 text-sm">
              No action integrations configured yet. Connect one from the provider list.
            </div>
          )}
        </section>
      )}
    </div>
  );
}
