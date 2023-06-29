import { Container } from '@mantine/core';

import PageHeader from '../../components/layout/components/PageHeader';
import PageContainer from '../../components/layout/components/PageContainer';
import { Tabs } from '../../design-system';
import { ApiKeysCard } from './tabs';
import { useAuthContext } from '../../components/providers/AuthProvider';
import { EmailSettings } from './tabs/EmailSettings';

enum MenuTitleEnum {
  API_KEYS = 'API Keys',
  EMAIL_SETTINGS = 'Email Settings',
}

const SettingsPageWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <PageContainer title="Settings">
      <PageHeader title="Settings" />
      <Container fluid mt={15} ml={5}>
        {children}
      </Container>
    </PageContainer>
  );
};

export function SettingsPage() {
  const { currentOrganization } = useAuthContext();
  const selfHosted = process.env.REACT_APP_DOCKER_HOSTED_ENV === 'true';

  const menuTabs = [
    {
      value: MenuTitleEnum.API_KEYS,
      content: <ApiKeysCard />,
    },
    {
      value: MenuTitleEnum.EMAIL_SETTINGS,
      content: <EmailSettings />,
    },
  ];

  if (selfHosted) {
    return (
      <SettingsPageWrapper>
        <ApiKeysCard />
      </SettingsPageWrapper>
    );
  }

  return (
    <SettingsPageWrapper>
      <Tabs loading={!currentOrganization} menuTabs={menuTabs} defaultValue={MenuTitleEnum.API_KEYS} />
    </SettingsPageWrapper>
  );
}
