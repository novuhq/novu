import { type IIconProps, IconConstruction, IconRocketLaunch } from '@novu/design-system';
import { useEnvironment } from '../../../hooks/useEnvironment';
import { ROUTES } from '../../../constants/routes';
import { BaseEnvironmentEnum } from '../../../constants/BaseEnvironmentEnum';
import { useState } from 'react';
import { type ISelectProps } from '@novu/design-system';
import { matchPath, useLocation, useMatch, useNavigate } from 'react-router-dom';
import { useFeatureFlag } from '../../../hooks';
import { FeatureFlagsKeysEnum } from '@novu/shared';

const ENVIRONMENT_ICON_LOOKUP: Record<BaseEnvironmentEnum, React.ReactElement<IIconProps>> = {
  [BaseEnvironmentEnum.DEVELOPMENT]: <IconConstruction />,
  [BaseEnvironmentEnum.PRODUCTION]: <IconRocketLaunch />,
};

export const useEnvironmentSelect = () => {
  const isV2ExperienceEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_V2_EXPERIENCE_ENABLED);
  const [isPopoverOpened, setIsPopoverOpened] = useState<boolean>(false);
  const location = useLocation();

  const { setEnvironment, isLoading, environment, readonly } = useEnvironment({
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
     * environments -- unless the path itself is based on a specific environment (e.g. API Keys)
     */
    const urlParts = location.pathname.replace('/', '').split('/');
    const redirectRoute: string | undefined = checkIfEnvBasedRoute() ? undefined : urlParts[0];

    /**
     * TODO: Review this logic to see if we want to handle this differently
     */
    if (value === 'Local') {
      await setEnvironment(BaseEnvironmentEnum.DEVELOPMENT, { route: '/studio' });
    } else {
      await setEnvironment(value as BaseEnvironmentEnum, { route: redirectRoute });
    }
  };

  const data = Object.values(BaseEnvironmentEnum).map((value) => ({
    label: value,
    value,
  }));

  if (isV2ExperienceEnabled) {
    data.push({
      label: 'Local' as BaseEnvironmentEnum,
      value: 'Local' as BaseEnvironmentEnum,
    });
  }

  return {
    loading: isLoading,
    data: data,
    value: environment?.name,
    onChange,
    readonly,
    icon: environment?.name ? ENVIRONMENT_ICON_LOOKUP[environment.name] : null,
    isPopoverOpened,
    setIsPopoverOpened,
    handlePopoverLinkClick,
  };
};

/** Determine if the current pathname is dependent on the current env */
function checkIfEnvBasedRoute() {
  return [ROUTES.API_KEYS, ROUTES.WEBHOOK].some((route) => matchPath(route, window.location.pathname));
}
