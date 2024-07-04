import { Center, Container, Loader } from '@mantine/core';
import { Outlet } from 'react-router-dom';

import { colors } from '@novu/design-system';
import PageContainer from '../../../components/layout/components/PageContainer';
import PageHeader from '../../../components/layout/components/PageHeader';
import { useAuth } from '../../../hooks/useAuth';
import { useEnvironment } from '../../../hooks';
import { useTelemetry } from '../../../hooks/useNovuAPI';

const LAYOUT = 'Layouts';

export function LayoutsPage() {
  const { currentOrganization, currentUser } = useAuth();
  const { environment } = useEnvironment();

  const track = useTelemetry();

  const handleLayoutAnalytics = (event: string, data?: Record<string, unknown>) => {
    track(`[Layout] - ${event}`, {
      _organizationId: currentOrganization?._id,
      _environmentId: environment?._id,
      userId: currentUser?._id,
      ...data,
    });
  };

  if (!currentOrganization) {
    return (
      <Center>
        <Loader color={colors.error} size={32} />
      </Center>
    );
  }

  return (
    <PageContainer title={LAYOUT}>
      <PageHeader title={LAYOUT} />
      <Container fluid px={30}>
        <Outlet
          context={{
            currentOrganization,
            handleLayoutAnalytics,
          }}
        />
      </Container>
    </PageContainer>
  );
}
