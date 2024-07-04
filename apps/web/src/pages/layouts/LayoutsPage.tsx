import { Center, Container, Loader } from '@mantine/core';
import { colors } from '@novu/design-system';
import PageContainer from '../../components/layout/components/PageContainer';
import PageHeader from '../../components/layout/components/PageHeader';
import { useAuth } from '../../hooks/useAuth';
import { LayoutList } from './LayoutList';

const LAYOUT = 'Layouts';

export function LayoutsPage() {
  const { currentOrganization } = useAuth();

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
        <LayoutList />
      </Container>
    </PageContainer>
  );
}
