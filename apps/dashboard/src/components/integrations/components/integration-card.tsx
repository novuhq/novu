import {
  ApiServiceLevelEnum,
  ChannelTypeEnum,
  type IEnvironment,
  type IIntegration,
  type IProviderConfig,
} from '@novu/shared';
import {
  RiCheckboxCircleFill,
  RiCloseCircleFill,
  RiLockStarLine,
  RiSettings4Line,
  RiStarSmileLine,
} from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/primitives/badge';
import { Button } from '@/components/primitives/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { UpgradeCTATooltip } from '@/components/upgrade-cta-tooltip';
import { useFetchSubscription } from '../../../hooks/use-fetch-subscription';
import { ROUTES } from '../../../utils/routes';
import { cn } from '../../../utils/ui';
import { EnvironmentBranchIcon } from '../../primitives/environment-branch-icon';
import { StatusBadge, StatusBadgeIcon } from '../../primitives/status-badge';
import { TableIntegration } from '../types';
import { ProviderIcon } from './provider-icon';
import { isDemoIntegration } from './utils/helpers';

type IntegrationCardVariant = 'default' | 'connectSheet';

type IntegrationCardProps = {
  integration: IIntegration;
  provider: IProviderConfig;
  environment: IEnvironment;
  onClick: (item: TableIntegration) => void;
  variant?: IntegrationCardVariant;
};

export function IntegrationCard({
  integration,
  provider,
  environment,
  onClick,
  variant = 'default',
}: IntegrationCardProps) {
  const navigate = useNavigate();
  const { subscription } = useFetchSubscription();

  const handleConfigureClick = (e: React.MouseEvent<HTMLElement>) => {
    if (integration.channel === ChannelTypeEnum.IN_APP && !integration.connected) {
      e.preventDefault();

      navigate(ROUTES.INBOX_EMBED + `?environmentId=${environment._id}`);
    } else {
      onClick({
        integrationId: integration._id ?? '',
        name: integration.name,
        identifier: integration.identifier,
        provider: provider.displayName,
        providerId: provider.id,
        channel: integration.channel,
        environment: environment.name,
        active: integration.active,
      });
    }
  };

  const isDemo = isDemoIntegration(provider.id);
  const isFreePlan = subscription?.apiServiceLevel === ApiServiceLevelEnum.FREE;

  if (variant === 'connectSheet') {
    return (
      <button
        type="button"
        className={cn(
          'group relative flex min-w-0 flex-1 basis-[calc(50%-0.5rem)] cursor-pointer flex-col gap-1.5 text-left sm:max-w-[157px]',
          'border-0 bg-transparent p-0 font-[inherit]',
          !integration.active && 'opacity-75 grayscale'
        )}
        onClick={handleConfigureClick}
        data-test-id={`integration-${integration._id}-row`}
      >
        <div className="border-stroke-soft relative flex min-h-20 items-center justify-center rounded-lg border bg-bg-white px-6 py-4 shadow-xs transition-shadow group-hover:shadow-md">
          {integration.primary ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="absolute left-2 top-2 flex size-6 items-center justify-center rounded-md">
                  <RiStarSmileLine className="text-feature size-4" aria-hidden />
                </span>
              </TooltipTrigger>
              <TooltipContent>This is your primary integration for the {provider.channel} channel.</TooltipContent>
            </Tooltip>
          ) : null}
          {isDemo ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="absolute right-1.5 top-1.5">
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
          ) : null}
          <div className="shadow-xs ring-stroke-soft/80 flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-white p-2 ring-1">
            <ProviderIcon providerId={provider.id} providerDisplayName={provider.displayName} className="size-5" />
          </div>
        </div>
        <div className="flex min-h-4 max-w-full items-center gap-2">
          <span className="text-text-strong text-label-xs truncate font-medium leading-4">{integration.name}</span>
        </div>
      </button>
    );
  }

  return (
    <div
      className={cn(
        'bg-card shadow-xs group relative flex min-h-[125px] cursor-pointer flex-col gap-2 overflow-hidden rounded-xl border border-neutral-200 p-3 transition-all hover:shadow-lg',
        !integration.active && 'opacity-75 grayscale'
      )}
      onClick={handleConfigureClick}
      data-test-id={`integration-${integration._id}-row`}
    >
      <div className="flex justify-between">
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
        <div className="flex items-center gap-1">
          {integration.primary && (
            <Tooltip>
              <TooltipTrigger>
                <RiStarSmileLine className="text-feature h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent>This is your primary integration for the {provider.channel} channel.</TooltipContent>
            </Tooltip>
          )}
          {integration.channel === ChannelTypeEnum.IN_APP && isFreePlan && (
            <UpgradeCTATooltip
              description="Upgrade to remove the Novu branding and extend notification snooze beyond 24 hours in your Inbox component."
              utmSource="in-app-upgrade-tooltip"
              side="right"
              align="center"
            >
              <RiLockStarLine className="text-warning h-4 w-4" />
            </UpgradeCTATooltip>
          )}
        </div>
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
