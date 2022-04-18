import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Container } from '@mantine/core';
import { IOrganizationEntity } from '@novu/shared';
import PageMeta from '../../components/layout/components/PageMeta';
import PageHeader from '../../components/layout/components/PageHeader';
import PageContainer from '../../components/layout/components/PageContainer';
import { Tabs } from '../../design-system';
import { BrandingForm } from './components/BrandingForm';
import { ApiKeysCard } from './components/ApiKeysCard';
import { InAppCenterCard } from './components/InAppCenterCard';
import { useQuery } from 'react-query';
import { getCurrentOrganization } from '../../api/organization';

export function SettingsPage() {
  const location = useLocation();

  const [activeTab, setActiveTab] = useState(0);

  const {
    data: organization,
    isLoading: isLoadingOrganization,
    refetch,
  } = useQuery<IOrganizationEntity>('/v1/organizations/me', getCurrentOrganization);

  useEffect(() => {
    const params = new URLSearchParams(location.search);

    if (params.get('screen') && params.get('screen') === 'sms') {
      setActiveTab(3);
    }
  }, [location]);

  const menuTabs = [
    {
      label: 'Branding',
      content: <BrandingForm isLoading={isLoadingOrganization} organization={organization} />,
    },
    {
      label: 'In App Center',
      content: <InAppCenterCard />,
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
        <Tabs loading={isLoadingOrganization} active={activeTab} onTabChange={setActiveTab} menuTabs={menuTabs} />
      </Container>
    </PageContainer>
  );
}
