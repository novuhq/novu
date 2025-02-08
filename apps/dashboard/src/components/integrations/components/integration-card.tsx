import { Badge } from '@/components/primitives/badge';
import { Button } from '@/components/primitives/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { ChannelTypeEnum, type IEnvironment, type IIntegration, type IProviderConfig } from '@novu/shared';
import { RiCheckboxCircleFill, RiCloseCircleFill, RiSettings4Line, RiStarSmileLine } from 'react-icons/ri';
import { cn } from '../../../utils/ui';
import { EnvironmentBranchIcon } from '../../primitives/environment-branch-icon';
import { StatusBadge, StatusBadgeIcon } from '../../primitives/status-badge';
import { TableIntegration } from '../types';
import { ProviderIcon } from './provider-icon';
import { isDemoIntegration } from './utils/helpers';

type IntegrationCardProps = {
  integration: IIntegration;
  provider: IProviderConfig;
  environment: IEnvironment;
  onClick: (item: TableIntegration) => void;
};

export function IntegrationCard({ integration, provider, environment, onClick }: IntegrationCardProps) {
  const handleConfigureClick = () => {
    onClick({
      integrationId: integration._id ?? '',
      name: integration.name,
      identifier: integration.identifier,
      provider: provider.displayName,
      channel: integration.channel,
      environment: environment.name,
      active: integration.active,
    });
  };

  const isDemo = isDemoIntegration(provider.id);

  return (
    <div
      className={cn(
        'bg-card shadow-xs group relative flex min-h-[125px] cursor-pointer flex-col gap-2 overflow-hidden rounded-xl border border-neutral-200 p-3 transition-all hover:shadow-lg',
        !integration.active && 'opacity-75 grayscale'
      )}
      onClick={handleConfigureClick}
      data-test-id={`integration-${integration._id}-row`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-1.5">
          <div className="relative h-6 w-6">
            <ProviderIcon
              providerId={provider.id}
              providerDisplayName={provider.displayName}
              className="h-full w-full"
            />
          </div>
          <span className="text-sm font-medium">{integration.name}</span>
        </div>
        {integration.primary && (
          <Tooltip>
            <TooltipTrigger>
              <RiStarSmileLine className="text-feature h-4 w-4" />
            </TooltipTrigger>
            <TooltipContent>This is your primary integration for the {provider.channel} channel.</TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="flex items-center gap-2">
        {isDemo && (
          <Tooltip>
            <TooltipTrigger className="flex h-[16px] items-center gap-1">
              <span className="flex h-[16px] items-center gap-1">
                <Badge variant="lighter" color="yellow" size="sm">
                  DEMO
                </Badge>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                This is a demo provider for testing purposes only and capped at 300{' '}
                {provider.channel === 'email' ? 'emails' : 'sms'} per month. Not suitable for production use.
              </p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      <div className="mt-auto flex items-center gap-2">
        {integration.channel === ChannelTypeEnum.IN_APP && !integration.connected ? (
          <Button
            size="xs"
            leadingIcon={RiSettings4Line}
            className="h-[26px]"
            variant="secondary"
            mode="outline"
            onClick={handleConfigureClick}
          >
            Connect
          </Button>
        ) : (
          <StatusBadge variant="light" status={integration.active ? 'completed' : 'disabled'}>
            <StatusBadgeIcon as={integration.active ? RiCheckboxCircleFill : RiCloseCircleFill} />
            {integration.active ? 'Active' : 'Inactive'}
          </StatusBadge>
        )}
        <StatusBadge variant="stroke" status="pending" className="gap-1 shadow-none">
          <EnvironmentBranchIcon size="xs" environment={environment} mode="ghost" />
          {environment.name}
        </StatusBadge>
      </div>
    </div>
  );
}
