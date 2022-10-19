import { SpotlightProvider } from '@mantine/spotlight';
import { useCallback, useContext, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { Activity, Bolt, Box, Settings, Repeat, Team } from '../../design-system/icons';
import { SpotlightContext } from '../../store/spotlightContext';
import { useEnvController } from '../../store/use-env-controller';

const getDestinationEnvironment = (environmentName: string): string =>
  environmentName === 'Production' ? 'Development' : 'Production';

export const SpotLight = ({ children }) => {
  const navigate = useNavigate();
  const { items, addItem } = useContext(SpotlightContext);
  const { setEnvironment, environment } = useEnvController();
  const { name: environmentName } = environment || {};

  const navigateTo = useCallback(
    (path) => {
      navigate(path);
    },
    [navigate]
  );

  const openExternalLink = useCallback((url) => {
    window?.open(url, '_blank')?.focus();
  }, []);

  const spotlightItems = useMemo(() => {
    const buildEnvironmentTitle = (name) => `Toggle to ${getDestinationEnvironment(name)} environment`;

    const buildEnvironmentOnTrigger = (name) => {
      /**
       * TODO: This setter doesn't work properly because internally the use-env-controller has
       * isLoadingMyEnvironments=true and isLoadingCurrentEnvironment=true
       */
      setEnvironment(getDestinationEnvironment(name));
    };

    return [
      {
        id: 'navigate-templates',
        title: 'Go to Notification Template',
        onTrigger: () => navigateTo('/templates'),
        icon: <Bolt />,
      },
      {
        id: 'navigate-integration',
        title: 'Go to Integrations',
        onTrigger: () => navigateTo('/integrations'),
        icon: <Box />,
      },
      {
        id: 'navigate-changes',
        title: 'Go to Changes',
        onTrigger: () => navigateTo('/changes'),
        icon: <Repeat />,
      },
      {
        id: 'navigate-settings',
        title: 'Go to Settings',
        onTrigger: () => navigateTo('/settings'),
        icon: <Settings />,
      },
      {
        id: 'navigate-activities',
        title: 'Go to Activities',
        onTrigger: () => navigateTo('/activities'),
        icon: <Activity />,
      },
      {
        id: 'navigate-team-members',
        title: 'Go to Team Members',
        onTrigger: () => navigateTo('/team'),
        icon: <Team />,
      },
      {
        id: 'navigate-docs',
        title: 'Go to Documentation',
        onTrigger: () => openExternalLink('https://docs.novu.co/'),
      },
      {
        id: 'navigate-support',
        title: 'Go to Support',
        onTrigger: () => openExternalLink('https://discord.com/invite/novu'),
      },
      {
        id: 'toggle-environment',
        title: buildEnvironmentTitle(environmentName),
        onTrigger: () => buildEnvironmentOnTrigger(environmentName),
      },
    ];
  }, [environmentName, setEnvironment, navigateTo, openExternalLink]);

  useEffect(() => {
    if (items.length === 0) {
      addItem(spotlightItems);
    }
  }, [addItem, spotlightItems, items]);

  if (items.length === 0) {
    return children;
  }

  return (
    <SpotlightProvider limit={7} shortcut={['mod + K']} actions={items}>
      {children}
    </SpotlightProvider>
  );
};
