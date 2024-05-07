import { Center, Container, Loader } from '@mantine/core';
import { Outlet } from 'react-router-dom';

import { colors } from '@novu/design-system';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import PageContainer from '../../../components/layout/components/PageContainer';
import PageHeader from '../../../components/layout/components/PageHeader';
import { useAuthContext } from '../../../components/providers/AuthProvider';
import { useSegment } from '../../../components/providers/SegmentProvider';
import { useEnvController, useFeatureFlag } from '../../../hooks';

const LAYOUT = 'Layouts';

export function LayoutsPage() {
  const { currentOrganization, currentUser } = useAuthContext();
  const { environment } = useEnvController();
  const isInformationArchitectureEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_INFORMATION_ARCHITECTURE_ENABLED);

  const segment = useSegment();

  const handleLayoutAnalytics = (event: string, data?: Record<string, unknown>) => {
    segment.track(`[Layout] - ${event}`, {
      _organizationId: currentOrganization?._id,
      _environmentId: environment?._id,
      userId: currentUser?._id,
      ...data,
    });
  };

  if (!isInformationArchitectureEnabled) {
    return null;
  }

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
