import { IconType } from 'react-icons/lib';
import { RiAddCircleLine } from 'react-icons/ri';
import { useLocation, useNavigate } from 'react-router-dom';
import { EnvironmentTypeEnum, PermissionsEnum } from '@novu/shared';

import { PermissionButton } from '@/components/primitives/permission-button';
import { useEnvironment } from '@/context/environment/hooks';
import { buildRoute, ROUTES } from '@/utils/routes';
import { Tooltip, TooltipContent, TooltipTrigger } from '../primitives/tooltip';
import { Button } from '../primitives/button';

export const CreateLayoutButton = ({
  icon = RiAddCircleLine,
  text = 'Create layout',
}: {
  icon?: IconType | undefined;
  text?: string;
}) => {
  const navigate = useNavigate();
  const { currentEnvironment } = useEnvironment();
  const { search } = useLocation();

  const handleCreateLayout = () => {
    navigate(`${buildRoute(ROUTES.LAYOUTS_CREATE, { environmentSlug: currentEnvironment?.slug ?? '' })}${search}`);
  };

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
          <a href="https://docs.novu.co/platform/account/roles-and-permissions" target="_blank" className="underline">
            Learn More ↗
          </a>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <PermissionButton
      permission={PermissionsEnum.LAYOUT_WRITE}
      mode="gradient"
      className="rounded-l-lg border-none text-white"
      variant="primary"
      size="xs"
      leadingIcon={icon}
      onClick={handleCreateLayout}
      disabled={currentEnvironment?.type !== EnvironmentTypeEnum.DEV}
    >
      {text}
    </PermissionButton>
  );
};
