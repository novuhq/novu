import { ChannelTypeEnum, IEnvironment, IIntegration, IProviderConfig } from '@novu/shared';
import { CHANNEL_TYPE_TO_STRING } from '@/utils/channels';
import { cn } from '@/utils/ui';
import { TableIntegration } from '../types';
import { IntegrationCard } from './integration-card';

type IntegrationChannelGroupVariant = 'default' | 'connectSheet';

type IntegrationChannelGroupProps = {
  channel: ChannelTypeEnum;
  integrations: IIntegration[];
  providers: IProviderConfig[];
  environments?: IEnvironment[];
  onItemClick: (item: TableIntegration) => void;
  excludeIntegrationIds?: string[];
  variant?: IntegrationChannelGroupVariant;
};

export function IntegrationChannelGroup({
  channel,
  integrations,
  providers,
  environments,
  onItemClick,
  excludeIntegrationIds,
  variant = 'default',
}: IntegrationChannelGroupProps) {
  const exclude = excludeIntegrationIds ? new Set(excludeIntegrationIds) : null;
  const visibleIntegrations = exclude
    ? integrations.filter((integration) => !exclude.has(integration._id))
    : integrations;

  if (visibleIntegrations.length === 0) {
    return null;
  }

  return (
    <div className={variant === 'connectSheet' ? 'space-y-3' : 'space-y-4'}>
      <h2
        className={cn(
          'font-medium',
          variant === 'connectSheet'
            ? 'text-text-soft text-[11px] font-semibold uppercase tracking-wider'
            : 'text-md text-foreground-950'
        )}
      >
        {CHANNEL_TYPE_TO_STRING[channel]}
      </h2>
      <div
        className={cn(
          variant === 'connectSheet'
            ? 'flex flex-wrap gap-4 p-1.5'
            : 'grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        )}
      >
        {visibleIntegrations.map((integration) => {
          const provider = providers.find((p) => p.id === integration.providerId);
          if (!provider) return null;

          const environment = environments?.find((env) => env._id === integration._environmentId);
          if (!environment) return null;

          return (
            <IntegrationCard
              key={integration._id}
              integration={integration}
              provider={provider}
              environment={environment}
              onClick={onItemClick}
              variant={variant}
            />
          );
        })}
      </div>
    </div>
  );
}
