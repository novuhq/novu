import {
  ChannelTypeEnum,
  EnvironmentTypeEnum,
  type IEnvironment,
  type IIntegration,
  type IProviderConfig,
} from '@novu/shared';
import { RiStarSmileLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/primitives/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { ROUTES } from '../../../utils/routes';
import { cn } from '../../../utils/ui';
import { TableIntegration } from '../types';
import { ProviderIcon } from './provider-icon';
import { getDemoIntegrationTooltipMessage, isDemoIntegration } from './utils/helpers';

type IntegrationCardProps = {
  integration: IIntegration;
  provider: IProviderConfig;
  environment: IEnvironment;
  onClick: (item: TableIntegration) => void;
};

/** Compact tile for an installed integration, shown in the connect sheet. */
export function IntegrationCard({ integration, provider, environment, onClick }: IntegrationCardProps) {
  const navigate = useNavigate();

  const handleConfigureClick = (e: React.MouseEvent<HTMLElement>) => {
    const shouldRedirectToInboxOnboarding =
      integration.channel === ChannelTypeEnum.IN_APP &&
      !integration.connected &&
      environment.type === EnvironmentTypeEnum.DEV;

    if (shouldRedirectToInboxOnboarding) {
      e.preventDefault();

      navigate(`${ROUTES.INBOX_EMBED}?environmentId=${environment._id}`);
    } else {
      onClick({
        integrationId: integration._id ?? '',
        name: integration.name,
        identifier: integration.identifier,
        provider: provider.displayName,
        providerId: provider.id,
        channel: integration.channel ?? provider.channel,
        environment: environment.name,
        active: integration.active,
      });
    }
  };

  const isDemo = isDemoIntegration(provider.id);
  const demoTooltipMessage = getDemoIntegrationTooltipMessage(provider.id, provider.channel);

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
              <p>{demoTooltipMessage}</p>
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
