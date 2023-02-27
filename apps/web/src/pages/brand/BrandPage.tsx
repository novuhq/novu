import { Container, TabsValue } from '@mantine/core';

import PageMeta from '../../components/layout/components/PageMeta';
import PageHeader from '../../components/layout/components/PageHeader';
import PageContainer from '../../components/layout/components/PageContainer';
import { Tabs } from '../../design-system';
import { useAuthContext } from '../../components/providers/AuthProvider';
import { BrandingForm, LayoutsListPage } from './tabs';
import { useSegment } from '../../components/providers/SegmentProvider';

const BRANDING = 'Assets';
const LAYOUT = 'Layouts';

export function BrandPage() {
  const { currentOrganization } = useAuthContext();
  const { isSegmentEnabled, track } = useSegment();

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

  const trackLayoutFocus = (value: TabsValue) => {
    if (value === LAYOUT && isSegmentEnabled()) {
      track('[Layout] - Tab Focus');
    }
  };

  return (
    <PageContainer>
      <PageMeta title="Brand" />
      <PageHeader title="Brand" />
      <Container fluid mt={15} ml={5}>
        <Tabs
          loading={!currentOrganization}
          menuTabs={menuTabs}
          defaultValue={BRANDING}
          onTabChange={trackLayoutFocus}
        />
      </Container>
    </PageContainer>
  );
}
