import { useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Container } from '@mantine/core';
import PageMeta from '../../components/layout/components/PageMeta';
import PageHeader from '../../components/layout/components/PageHeader';
import PageContainer from '../../components/layout/components/PageContainer';
import { Tabs } from '../../design-system';
import { BrandingForm, ApiKeysCard, InAppCenterCard } from './tabs';
import { AuthContext } from '../../store/authContext';

export function SettingsPage() {
  const location = useLocation();
  const { currentOrganization } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(location.search);

    if (params.get('screen') && params.get('screen') === 'sms') {
      setActiveTab(3);
    }
  }, [location]);

  const menuTabs = [
    {
      label: 'Branding',
      content: <BrandingForm isLoading={!currentOrganization} organization={currentOrganization} />,
    },
    {
      label: 'In App Center',
      content: <InAppCenterCard />,
    },
    {
      label: 'API Keys',
      content: <ApiKeysCard />,
    },
  ];

  return (
    <PageContainer>
      <PageMeta title="Settings" />
      <PageHeader title="Settings" />
      <Container fluid mt={15} ml={5}>
        <Tabs loading={!currentOrganization} active={activeTab} onTabChange={setActiveTab} menuTabs={menuTabs} />
      </Container>
    </PageContainer>
  );
}
