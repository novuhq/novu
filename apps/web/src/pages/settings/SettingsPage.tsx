import { Container } from '@mantine/core';

import PageMeta from '../../components/layout/components/PageMeta';
import PageHeader from '../../components/layout/components/PageHeader';
import PageContainer from '../../components/layout/components/PageContainer';
import { Tabs } from '../../design-system';
import { ApiKeysCard, InAppCenterCard } from './tabs';
import { useAuthContext } from '../../components/providers/AuthProvider';
import { EmailSettings } from './tabs/EmailSettings';

enum MenuTitleEnum {
  IN_APP_CENTER = 'In App Center',
  API_KEYS = 'API Keys',
  EMAIL_SETTINGS = 'Email Settings',
}

export function SettingsPage() {
  const { currentOrganization } = useAuthContext();
  const selfHosted = process.env.REACT_APP_DOCKER_HOSTED_ENV === 'true';

  let menuTabs = [
    {
      value: MenuTitleEnum.IN_APP_CENTER,
      content: <InAppCenterCard />,
    },
    {
      value: MenuTitleEnum.API_KEYS,
      content: <ApiKeysCard />,
    },
  ];

  if (!selfHosted) {
    menuTabs = [
      ...menuTabs,
      {
        value: MenuTitleEnum.EMAIL_SETTINGS,
        content: <EmailSettings />,
      },
    ];
  }

  return (
    <PageContainer>
      <PageMeta title="Settings" />
      <PageHeader title="Settings" />
      <Container fluid mt={15} ml={5}>
        <Tabs loading={!currentOrganization} menuTabs={menuTabs} defaultValue={MenuTitleEnum.IN_APP_CENTER} />
      </Container>
    </PageContainer>
  );
}
