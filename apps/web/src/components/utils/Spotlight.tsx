import { SpotlightProvider } from '@mantine/spotlight';
import { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bolt } from '../../design-system/icons';
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
