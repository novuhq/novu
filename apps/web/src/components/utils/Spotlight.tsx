import { SpotlightProvider } from '@mantine/spotlight';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Bolt, Box, Settings, Repeat, Team, Brand, Chat } from '@novu/design-system';
import { UTM_CAMPAIGN_QUERY_PARAM } from '@novu/shared';

import { ROUTES } from '../../constants/routes.enum';
import { useSpotlightContext } from '../providers/SpotlightProvider';

export const SpotLight = ({ children }) => {
  const navigate = useNavigate();
  const { items, addItem } = useSpotlightContext();

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
    ]);
  }, [navigate, addItem]);

  return (
    <SpotlightProvider limit={7} shortcut={['mod + K']} actions={items}>
      {children}
    </SpotlightProvider>
  );
};
