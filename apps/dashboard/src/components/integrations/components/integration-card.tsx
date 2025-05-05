import { Badge } from '@/components/primitives/badge';
import { Button } from '@/components/primitives/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import {
  ApiServiceLevelEnum,
  ChannelTypeEnum,
  FeatureFlagsKeysEnum,
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
import { ROUTES } from '../../../utils/routes';
import { cn } from '../../../utils/ui';
import { EnvironmentBranchIcon } from '../../primitives/environment-branch-icon';
import { StatusBadge, StatusBadgeIcon } from '../../primitives/status-badge';
import { TableIntegration } from '../types';
import { ProviderIcon } from './provider-icon';
import { isDemoIntegration } from './utils/helpers';
import { useFetchSubscription } from '../../../hooks/use-fetch-subscription';
import { ExternalLink } from 'lucide-react';
import { useFeatureFlag } from '@/hooks/use-feature-flag';

type IntegrationCardProps = {
  integration: IIntegration;
  provider: IProviderConfig;
  environment: IEnvironment;
  onClick: (item: TableIntegration) => void;
};

export function IntegrationCard({ integration, provider, environment, onClick }: IntegrationCardProps) {
  const navigate = useNavigate();
  const { subscription } = useFetchSubscription();
  const isSnoozeEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_SNOOZE_ENABLED);

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
        channel: integration.channel,
        environment: environment.name,
        active: integration.active,
      });
    }
  };

  const isDemo = isDemoIntegration(provider.id);
  const isFreePlan = subscription?.apiServiceLevel === ApiServiceLevelEnum.FREE;

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
          {integration.channel === ChannelTypeEnum.IN_APP && isFreePlan && isSnoozeEnabled && (
            <InAppPremiumFeaturesIcon />
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

function InAppPremiumFeaturesIcon() {
  const navigate = useNavigate();

  const handleUpgradeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(ROUTES.SETTINGS_BILLING + '?utm_source=in-app-upgrade-tooltip');
  };

  return (
    <Tooltip>
      <TooltipTrigger>
        <RiLockStarLine className="text-warning h-4 w-4" />
      </TooltipTrigger>
      <TooltipContent>
        <div className="flex flex-col gap-2">
          <div>
            Upgrade to remove the 'Inbox by Novu' badge and enable notification reminders in your{' '}
            <span className="font-mono">{`<Inbox />`}</span> component.
          </div>
          <button onClick={handleUpgradeClick} className="flex items-center gap-1 text-xs font-medium hover:underline">
            Upgrade now <ExternalLink size={12} />
          </button>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
