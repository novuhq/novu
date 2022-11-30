import { useContext } from 'react';
import { Container } from '@mantine/core';

import PageMeta from '../../components/layout/components/PageMeta';
import PageHeader from '../../components/layout/components/PageHeader';
import PageContainer from '../../components/layout/components/PageContainer';
import { Tabs } from '../../design-system';
import { BrandingForm, ApiKeysCard, InAppCenterCard } from './tabs';
import { AuthContext } from '../../store/authContext';

const BRANDING = 'Branding';
const IN_APP_CENTER = 'In App Center';
const API_KEYS = 'API Keys';

export function SettingsPage() {
  const { currentOrganization } = useContext(AuthContext);

  const menuTabs = [
    {
      value: BRANDING,
      content: <BrandingForm isLoading={!currentOrganization} organization={currentOrganization} />,
    },
    {
      value: IN_APP_CENTER,
      content: <InAppCenterCard />,
    },
    {
      value: API_KEYS,
      content: <ApiKeysCard />,
    },
  ];

  return (
    <PageContainer>
      <PageMeta title="Settings" />
      <PageHeader title="Settings" />
      <Container fluid mt={15} ml={5}>
        <Tabs loading={!currentOrganization} menuTabs={menuTabs} defaultValue={BRANDING} />
      </Container>
    </PageContainer>
  );
}
