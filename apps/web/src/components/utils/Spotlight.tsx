import { SpotlightProvider } from '@mantine/spotlight';
import { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bolt, Box, Settings, Repeat } from '../../design-system/icons';
import { SpotlightContext } from '../../store/spotlightContext';

export const SpotLight = ({ children }) => {
  const navigate = useNavigate();
  const { items, addItem } = useContext(SpotlightContext);

  useEffect(() => {
    addItem([
      {
        id: 'navigate-templates',
        title: 'Go to Notification Template',
        onTrigger: () => navigate('/templates'),
        icon: <Bolt />,
      },
      {
        id: 'navigate-integration',
        title: 'Go to Integrations',
        onTrigger: () => navigate('/integrations'),
        icon: <Box />,
      },
      {
        id: 'navigate-settings',
        title: 'Go to Settings',
        onTrigger: () => navigate('/settings'),
        icon: <Settings />,
      },
      {
        id: 'navigate-changes',
        title: 'Go to Changes',
        onTrigger: () => navigate('/changes'),
        icon: <Repeat />,
      },
      {
        id: 'navigate-docs',
        title: 'Go to Documentation',
        onTrigger: () => {
          window?.open('https://docs.novu.co/', '_blank')?.focus();
        },
      },
      {
        id: 'navigate-support',
        title: 'Go to Support',
        onTrigger: () => {
          window?.open('https://discord.com/invite/novu', '_blank')?.focus();
        },
      },
    ]);
  }, []);

  return (
    <SpotlightProvider limit={7} shortcut={['mod + K']} actions={items}>
      {children}
    </SpotlightProvider>
  );
};
