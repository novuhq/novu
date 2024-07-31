import { SpotlightProvider } from '@mantine/spotlight';
import { Activity, Bolt, Box, Brand, Chat, IconLogout, Repeat, Settings, Team } from '@novu/design-system';
import { UTM_CAMPAIGN_QUERY_PARAM } from '@novu/shared';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { ROUTES } from '../../constants/routes';
import useThemeChange from '../../hooks/useThemeChange';
import { useSpotlightContext } from '../providers/SpotlightProvider';
import useStyles from './Spotlight.styles';

export const SpotLight = ({ children }) => {
  const navigate = useNavigate();
  const { items, addItem } = useSpotlightContext();
  const { toggleColorScheme, Icon } = useThemeChange();
  const { classes } = useStyles();

  useEffect(() => {
    addItem([
      {
        id: 'navigate-templates',
        title: 'Go to Workflows',
        onTrigger: () => navigate(ROUTES.WORKFLOWS),
        icon: <Bolt />,
      },
      {
        id: 'navigate-integration',
        title: 'Go to Integrations',
        onTrigger: () => navigate(ROUTES.INTEGRATIONS),
        icon: <Box />,
      },
      {
        id: 'navigate-changes',
        title: 'Go to Changes',
        onTrigger: () => navigate(ROUTES.CHANGES),
        icon: <Repeat />,
      },
      {
        id: 'navigate-settings',
        title: 'Go to Settings',
        onTrigger: () => navigate(ROUTES.SETTINGS),
        icon: <Settings />,
      },
      {
        id: 'navigate-activities',
        title: 'Go to Activities',
        onTrigger: () => navigate(ROUTES.ACTIVITIES),
        icon: <Activity />,
      },
      {
        id: 'navigate-team-members',
        title: 'Go to Team Members',
        onTrigger: () => navigate(ROUTES.TEAM),
        icon: <Team />,
      },
      {
        id: 'navigate-brand',
        title: 'Go to Brand',
        onTrigger: () => navigate('/brand'),
        icon: <Brand />,
      },
      {
        id: 'navigate-docs',
        title: 'Go to Documentation',
        onTrigger: () => {
          window?.open(`https://docs.novu.co${UTM_CAMPAIGN_QUERY_PARAM}`, '_blank')?.focus();
        },
      },
      {
        id: 'navigate-support',
        title: 'Go to Support',
        onTrigger: () => {
          window?.open('https://discord.com/invite/novu', '_blank')?.focus();
        },
      },
      {
        id: 'navigate-share-feedback',
        title: 'Share Feedback',
        onTrigger: () => {
          window?.open('https://github.com/novuhq/novu/issues/new/choose', '_blank')?.focus();
        },
        icon: <Chat />,
      },
      {
        id: 'toggle-theme',
        title: 'Toggle Theme',
        icon: <Icon title="color-scheme-preference-icon" />,
        onTrigger: () => {
          toggleColorScheme();
        },
      },
    ]);
  }, [navigate, addItem, Icon, toggleColorScheme]);

  return (
    <SpotlightProvider limit={7} shortcut={['mod + K']} actions={items} classNames={classes}>
      {children}
    </SpotlightProvider>
  );
};
