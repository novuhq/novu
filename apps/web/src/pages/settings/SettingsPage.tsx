import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Container } from '@mantine/core';
import { useEnvironment } from '../../api/hooks/use-environment';
import PageMeta from '../../components/layout/components/PageMeta';
import PageHeader from '../../components/layout/components/PageHeader';
import PageContainer from '../../components/layout/components/PageContainer';
import { Tabs } from '../../design-system';
import { BrandingForm } from './components/BrandingForm';
import { ApiKeysCard } from './components/ApiKeysCard';
import { InAppCenterCard } from './components/InAppCenterCard';

export function SettingsPage() {
  const location = useLocation();

  const [activeTab, setActiveTab] = useState(0);

  const { environment, loading: isLoadingEnvironment, refetch } = useEnvironment();

  useEffect(() => {
    const params = new URLSearchParams(location.search);

    if (params.get('screen') && params.get('screen') === 'sms') {
      setActiveTab(3);
    }
  }, [location]);

  const menuTabs = [
    {
      label: 'Branding',
      content: <BrandingForm isLoading={isLoadingEnvironment} environment={environment} />,
    },
    {
      label: 'In App Center',
      content: <InAppCenterCard environment={environment} />,
    },
    {
      label: 'Api Keys',
      content: <ApiKeysCard />,
    },
  ];

  return (
    <PageContainer>
      <PageMeta title="Settings" />
      <PageHeader title="Settings" />
      <Container fluid mt={15} ml={5}>
        <Tabs loading={isLoadingEnvironment} active={activeTab} onTabChange={setActiveTab} menuTabs={menuTabs} />
      </Container>
    </PageContainer>
  );
}
