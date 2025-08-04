import { ApiServiceLevelEnum, EnvironmentTypeEnum, PermissionsEnum } from '@novu/shared';
import { IconType } from 'react-icons/lib';
import { RiAddCircleLine } from 'react-icons/ri';
import { useLocation, useNavigate } from 'react-router-dom';

import { PermissionButton } from '@/components/primitives/permission-button';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchLayouts } from '@/hooks/use-fetch-layouts';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
import { useTelemetry } from '@/hooks/use-telemetry';
import { buildRoute, ROUTES } from '@/utils/routes';
import { TelemetryEvent } from '@/utils/telemetry';
import { Button } from '../primitives/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../primitives/tooltip';
import { useLayoutsUrlState } from './hooks/use-layouts-url-state';

export const CreateLayoutButton = ({
  icon = RiAddCircleLine,
  text = 'Create layout',
  disabled = false,
}: {
  icon?: IconType | undefined;
  text?: string;
  disabled?: boolean;
}) => {
  const track = useTelemetry();
  const navigate = useNavigate();
  const { currentEnvironment } = useEnvironment();
  const { search } = useLocation();
  const { subscription } = useFetchSubscription();
  const tier = subscription?.apiServiceLevel || ApiServiceLevelEnum.FREE;
  const { filterValues } = useLayoutsUrlState();
  const { data } = useFetchLayouts({
    limit: filterValues.limit,
    offset: filterValues.offset,
    orderBy: filterValues.orderBy,
    orderDirection: filterValues.orderDirection,
    query: filterValues.query,
  });

  const handleCreateLayout = () => {
    track(TelemetryEvent.LAYOUTS_CREATE_CLICKED);
    navigate(`${buildRoute(ROUTES.LAYOUTS_CREATE, { environmentSlug: currentEnvironment?.slug ?? '' })}${search}`);
  };

  if (tier === ApiServiceLevelEnum.FREE && data?.layouts && data?.layouts?.length >= 1) {
    return (
      <Tooltip>
        <TooltipTrigger className="cursor-not-allowed">
          <Button
            className="text-label-xs gap-1 rounded-lg p-2"
            variant="primary"
            disabled
            size="xs"
            leadingIcon={icon}
          >
            {text}
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-40">Upgrade to Pro+ to create more layouts</TooltipContent>
      </Tooltip>
    );
  }

  if (currentEnvironment?.type !== EnvironmentTypeEnum.DEV) {
    return (
      <Tooltip>
        <TooltipTrigger className="cursor-not-allowed">
          <Button
            className="text-label-xs gap-1 rounded-lg p-2"
            variant="primary"
            disabled
            size="xs"
            leadingIcon={icon}
          >
            {text}
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-60">
          {'Create the layout in your development environment. '}
          <a
            href="https://docs.novu.co/platform/workflow/layouts"
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Learn more about layouts"
            className="underline"
          >
            Learn More ↗
          </a>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <PermissionButton
      permission={PermissionsEnum.WORKFLOW_WRITE}
      className="rounded-l-lg border-none text-white"
      variant="primary"
      size="xs"
      leadingIcon={icon}
      onClick={handleCreateLayout}
      disabled={disabled || currentEnvironment?.type !== EnvironmentTypeEnum.DEV}
    >
      {text}
    </PermissionButton>
  );
};
