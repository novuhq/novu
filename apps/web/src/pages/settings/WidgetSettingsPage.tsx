import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from 'react-query';
import { ActionIcon, Container, Space } from '@mantine/core';
import { Prism } from '@mantine/prism';
import { useClipboard } from '@mantine/hooks';
import { getApiKeys } from '../../api/application';
import { useApplication } from '../../api/hooks/use-application';
import PageHeader from '../../components/layout/components/PageHeader';
import PageContainer from '../../components/layout/components/PageContainer';
import { Tabs, Input, Title, Text, Tooltip, colors } from '../../design-system';
import { Copy, Check } from '../../design-system/icons';
import { EmailSettingsForm } from './components/EmailSettingsForm';
import { SmsSettingsForm } from './components/SmsSettingsForm';
import { BrandingForm } from './components/BrandingForm';

export function WidgetSettingsPage() {
  const location = useLocation();
  const clipboard = useClipboard({ timeout: 1000 });
  const [activeTab, setActiveTab] = useState(0);

  const { application, loading: isLoadingApplication, refetch } = useApplication();

  const { data: apiKeys, isLoading: isLoadingApiKeys } = useQuery<{ key: string }[]>('getApiKeys', getApiKeys);

  const embedCode = `<script>
  (function(n,o,t,i,f) {
    n[i] = {}, m = ['init']; n[i]._c = [];m.forEach(me => n[i][me] = function() {n[i]._c.push([me, arguments])});
    var elt = o.createElement(f); elt.type = "text/javascript"; elt.async = true; elt.src = t;
    var before = o.getElementsByTagName(f)[0]; before.parentNode.insertBefore(elt, before);
  })(window, document, '${process.env.REACT_APP_WIDGET_SDK_PATH}', 'notifire', 'script');

  notifire.init('${application?.identifier}', '#notification-bell', {
    $user_id: "<REPLACE_WITH_USER_UNIQUE_IDENTIFIER>",
    $email: "<REPLACE_WITH_USER_EMAIL>",
    $first_name: "<REPLACE_WITH_USER_NAME>",
    $last_name: "<REPLACE_WITH_USER_LAST_NAME>",
  });
</script>`;

  useEffect(() => {
    const params = new URLSearchParams(location.search);

    if (params.get('screen') && params.get('screen') === 'sms') {
      setActiveTab(3);
    }
  }, [location]);

  const menuTabs = [
    { label: 'Branding', content: <BrandingForm isLoading={isLoadingApplication} application={application} /> },
    {
      label: 'In App Center',
      content: (
        <Container mb={20} ml={0} padding={0} sx={{ paddingTop: '41px' }}>
          <Title size={2}>In-App Widget Embed Code</Title>
          <Space h={35} />
          <Text weight="bold">Copy this snippet to your code before the closing body tag.</Text>
          <Text mt={5} mb={10} weight="bold">
            Change the #notification-bell selector with the appropriate bell css selector in your app layout.
          </Text>
          <Prism
            styles={(theme) => ({
              code: {
                fontWeight: '400',
                color: `${colors.B60} !important`,
                backgroundColor: 'transparent !important',
                border: ` 1px solid ${theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[5]}`,
                borderRadius: '7px',
              },
            })}
            language="jsx"
            data-test-id="embed-code-snippet">
            {embedCode}
          </Prism>
        </Container>
      ),
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
      content: (
        <Container ml={0} mb={20} padding={0} sx={{ paddingTop: '41px' }}>
          <Title size={2}>Api Keys</Title>
          <Space h={35} />
          <Input
            label="Use this api key to interact with the notifire api"
            readOnly
            rightSection={
              <Tooltip label={clipboard.copied ? 'Copied!' : 'Copy Key'}>
                <ActionIcon variant="transparent" onClick={() => clipboard.copy(apiKeys?.length ? apiKeys[0].key : '')}>
                  {clipboard.copied ? <Check /> : <Copy />}
                </ActionIcon>
              </Tooltip>
            }
            value={apiKeys?.length ? apiKeys[0].key : ''}
            data-test-id="api-key-container"
          />
        </Container>
      ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader title="Settings" />
      <Container fluid mt={15} ml={5}>
        <Tabs active={activeTab} onTabChange={setActiveTab} menuTabs={menuTabs} />
      </Container>
    </PageContainer>
  );
}
