import { type IIconProps, IconConstruction, IconRocketLaunch } from '@novu/design-system';
import { useEnvController, ROUTES, BaseEnvironmentEnum } from '@novu/shared-web';
import { useState } from 'react';
import { type ISelectProps } from '@novu/design-system';
import { useLocation } from 'react-router-dom';

const ENVIRONMENT_ICON_LOOKUP: Record<BaseEnvironmentEnum, React.ReactElement<IIconProps>> = {
  [BaseEnvironmentEnum.DEVELOPMENT]: <IconConstruction />,
  [BaseEnvironmentEnum.PRODUCTION]: <IconRocketLaunch />,
};

export const useEnvironmentSelect = () => {
  const [isPopoverOpened, setIsPopoverOpened] = useState<boolean>(false);

  const location = useLocation();

  const { setEnvironment, isLoading, environment, readonly } = useEnvController({
    onSuccess: (newEnvironment) => {
      setIsPopoverOpened(!!newEnvironment?._parentId);
    },
  });

  async function handlePopoverLinkClick(e) {
    e.preventDefault();

    await setEnvironment(BaseEnvironmentEnum.DEVELOPMENT, { route: ROUTES.CHANGES });
  }

  const onChange: ISelectProps['onChange'] = async (value) => {
    if (typeof value !== 'string') {
      return;
    }

    /*
     * this navigates users to the "base" page of the application to avoid sub-pages opened with data from other
     * environments.
     */
    const urlParts = location.pathname.replace('/', '').split('/');
    const baseRoute = urlParts[0];
    await setEnvironment(value as BaseEnvironmentEnum, { route: baseRoute });
  };

  return {
    loading: isLoading,
    data: Object.values(BaseEnvironmentEnum).map((value) => ({
      label: value,
      value,
    })),
    value: environment?.name,
    onChange,
    readonly,
    icon: environment?.name ? ENVIRONMENT_ICON_LOOKUP[environment.name] : null,
    isPopoverOpened,
    setIsPopoverOpened,
    handlePopoverLinkClick,
  };
};
