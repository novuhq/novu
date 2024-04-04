import { Center, Container, Loader } from '@mantine/core';
import { colors, PageContainer } from '@novu/design-system';
import { IS_DOCKER_HOSTED, useAuthContext } from '@novu/shared-web';
import { Outlet } from 'react-router-dom';
import PageHeader from '../../../components/layout/components/PageHeader';
import { ApiKeysCard } from '../tabs';

export function SettingsPage() {
  const { currentOrganization } = useAuthContext();
  const selfHosted = IS_DOCKER_HOSTED;

  if (!currentOrganization) {
    return (
      <Center>
        <Loader color={colors.error} size={32} />
      </Center>
    );
  }

  if (selfHosted) {
    return (
      <SettingsPageWrapper>
        <ApiKeysCard />
      </SettingsPageWrapper>
    );
  }

  return (
    <Outlet
      context={{
        currentOrganization,
      }}
    />
  );
}

export const SettingsPageWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <PageContainer title="Settings">
      <PageHeader title="Settings" />
      <Container fluid mt={15} pl={24}>
        {children}
      </Container>
    </PageContainer>
  );
};
