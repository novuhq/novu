import { ChannelTypeEnum, IEnvironment, IIntegration, IProviderConfig } from '@novu/shared';
import { TableIntegration } from '../types';
import { IntegrationCard } from './integration-card';
import { CHANNEL_TYPE_TO_STRING } from '@/utils/channels';

type IntegrationChannelGroupProps = {
  channel: ChannelTypeEnum;
  integrations: IIntegration[];
  providers: IProviderConfig[];
  environments?: IEnvironment[];
  onItemClick: (item: TableIntegration) => void;
};

export function IntegrationChannelGroup({
  channel,
  integrations,
  providers,
  environments,
  onItemClick,
}: IntegrationChannelGroupProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-md text-foreground-950 font-medium">{CHANNEL_TYPE_TO_STRING[channel]}</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {integrations.map((integration) => {
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
            />
          );
        })}
      </div>
    </div>
  );
}
