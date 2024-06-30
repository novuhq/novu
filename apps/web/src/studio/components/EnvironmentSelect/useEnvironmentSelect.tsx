import { type ISelectProps } from '@novu/design-system';
import { IconComputer, IconConstruction, IconRocketLaunch, type IIconProps } from '@novu/novui/icons';
import { useEnvironment } from '../../../hooks';
import { ROUTES } from '../../../constants/routes';
import { useState } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import { EnvironmentEnum } from '../../constants/EnvironmentEnum';
import { isStudioRoute } from '../../utils/routing';

const ENVIRONMENT_ICON_LOOKUP: Record<EnvironmentEnum, React.ReactElement<IIconProps>> = {
  [EnvironmentEnum.DEVELOPMENT]: <IconConstruction />,
  [EnvironmentEnum.PRODUCTION]: <IconRocketLaunch />,
};

export const useEnvironmentSelect = () => {
  const [isPopoverOpened, setIsPopoverOpened] = useState<boolean>(false);
  const location = useLocation();

  const { setEnvironment, isLoading, environment, readonly } = useEnvironment({
    onSuccess: (newEnvironment) => {
      setIsPopoverOpened(!!newEnvironment?._parentId);
    },
  });

  async function handlePopoverLinkClick(e) {
    e.preventDefault();

    await setEnvironment(EnvironmentEnum.DEVELOPMENT, { route: ROUTES.CHANGES });
  }

  const onChange: ISelectProps['onChange'] = async (value) => {
    if (typeof value !== 'string') {
      return;
    }

    /*
     * this navigates users to the "base" page of the application to avoid sub-pages opened with data from other
     * environments -- unless the path itself is based on a specific environment (e.g. API Keys)
     */
    const urlParts = location.pathname.replace('/', '').split('/');
    let redirectRoute: string | undefined = checkIfEnvBasedRoute() ? undefined : urlParts[0];

    if (isStudioRoute(location.pathname)) {
      redirectRoute = 'workflows';
    }

    await setEnvironment(value as EnvironmentEnum, { route: redirectRoute });
  };

  let name = environment?.name;
  let icon = environment?.name ? ENVIRONMENT_ICON_LOOKUP[environment.name] : null;
  if (isStudioRoute(location.pathname)) {
    name = 'Local';
    icon = ENVIRONMENT_ICON_LOOKUP[name];
  }

  return {
    loading: isLoading,
    data: Object.values(EnvironmentEnum).map((value) => ({
      label: value,
      value,
    })),
    value: name,
    onChange,
    readonly,
    icon,
    isPopoverOpened,
    setIsPopoverOpened,
    handlePopoverLinkClick,
  };
};

/** Determine if the current pathname is dependent on the current env */
function checkIfEnvBasedRoute() {
  return [ROUTES.API_KEYS, ROUTES.WEBHOOK].some((route) => matchPath(route, window.location.pathname));
}
