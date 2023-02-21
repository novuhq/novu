import { Container } from '@mantine/core';

import PageMeta from '../../components/layout/components/PageMeta';
import PageHeader from '../../components/layout/components/PageHeader';
import PageContainer from '../../components/layout/components/PageContainer';
import { Tabs } from '../../design-system';
import { useAuthContext } from '../../components/providers/AuthProvider';
import { BrandingForm, LayoutsListPage } from './tabs';

const BRANDING = 'Assets';
const LAYOUT = 'Layouts';

export function BrandPage() {
  const { currentOrganization } = useAuthContext();

  const menuTabs = [
    {
      value: BRANDING,
      content: <BrandingForm isLoading={!currentOrganization} organization={currentOrganization} />,
    },
    {
      value: LAYOUT,
      content: <LayoutsListPage />,
    },
  ];

  return (
    <PageContainer>
      <PageMeta title="Brand" />
      <PageHeader title="Brand" />
      <Container fluid mt={15} ml={5}>
        <Tabs loading={!currentOrganization} menuTabs={menuTabs} defaultValue={BRANDING} />
      </Container>
    </PageContainer>
  );
}
