import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Container } from '@mantine/core';
import { useApplication } from '../../api/hooks/use-application';
import PageHeader from '../../components/layout/components/PageHeader';
import PageContainer from '../../components/layout/components/PageContainer';
import { Tabs } from '../../design-system';
import { EmailSettingsForm } from './components/EmailSettingsForm';
import { SmsSettingsForm } from './components/SmsSettingsForm';
import { BrandingForm } from './components/BrandingForm';
import { ApiKeysCard } from './components/ApiKeysCard';
import { InAppCenterCard } from './components/InAppCenterCard';

export function WidgetSettingsPage() {
  const location = useLocation();

  const [activeTab, setActiveTab] = useState(0);

  const { application, loading: isLoadingApplication, refetch } = useApplication();

  useEffect(() => {
    const params = new URLSearchParams(location.search);

    if (params.get('screen') && params.get('screen') === 'sms') {
      setActiveTab(3);
    }
  }, [location]);

  const menuTabs = [
    { label: 'Branding', content: <BrandingForm application={application} /> },
    {
      label: 'In App Center',
      content: <InAppCenterCard application={application} />,
    },
    {
      label: 'Email Settings',
      content: <EmailSettingsForm application={application} refetch={refetch} />,
    },
    {
      label: 'SMS',
      content: <SmsSettingsForm application={application} refetch={refetch} />,
    },
    {
      label: 'Api Keys',
      content: <ApiKeysCard />,
    },
  ];

  return (
    <PageContainer>
      <PageHeader title="Settings" />
      <Container fluid mt={15} ml={5}>
        <Tabs loading={isLoadingApplication} active={activeTab} onTabChange={setActiveTab} menuTabs={menuTabs} />
      </Container>
    </PageContainer>
  );
}
