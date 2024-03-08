import { type IIconProps, IconConstruction, IconRocketLaunch } from '@novu/design-system';
import { useEnvController, ROUTES, BaseEnvironmentEnum } from '@novu/shared-web';
import { useState } from 'react';
import { type ISelectProps } from '@novu/design-system';

const ENVIRONMENT_ICON_LOOKUP: Record<BaseEnvironmentEnum, React.ReactElement<IIconProps>> = {
  [BaseEnvironmentEnum.DEVELOPMENT]: <IconConstruction />,
  [BaseEnvironmentEnum.PRODUCTION]: <IconRocketLaunch />,
};

export const useEnvironmentSelect = () => {
  const [isPopoverOpened, setIsPopoverOpened] = useState<boolean>(false);

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
    await setEnvironment(value as BaseEnvironmentEnum, { route: null });
  };

  return {
    loading: isLoading,
    data: Object.values(BaseEnvironmentEnum).map((value) => ({
      label: value,
      value,
    })),
    defaultValue: environment?.name,
    value: environment?.name,
    onChange,
    readonly,
    icon: environment?.name ? ENVIRONMENT_ICON_LOOKUP[environment.name] : null,
    isPopoverOpened,
    setIsPopoverOpened,
    handlePopoverLinkClick,
  };
};
