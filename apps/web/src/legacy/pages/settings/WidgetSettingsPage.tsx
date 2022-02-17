import { Button, Card, Form, Input, message, Tabs, Typography, Upload } from 'antd';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { useMutation, useQuery } from 'react-query';
import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { PageHeader } from '../../components/layout/components/PageHeader';
import { getApiKeys, getCurrentApplication, updateEmailSettings, updateSmsSettings } from '../../../api/application';
import { BrandingForm } from './components/BrandingForm';
import { useApplication } from '../../../api/hooks/use-application';

const { TabPane } = Tabs;

export function WidgetSettingsPage() {
  const location = useLocation();
  const [selectedTab, setSelectedTab] = useState<string | 'sms'>('0');
  const { isLoading: isLoadingEmailSettings, mutateAsync: changeEmailSettings } = useMutation<
    { senderEmail: string },
    { error: string; message: string; statusCode: number },
    { senderEmail: string; senderName: string }
  >(updateEmailSettings);

  const { isLoading: isLoadingSmsSettings, mutateAsync: updateSmsSettingsMutation } = useMutation<
    { senderEmail: string },
    { error: string; message: string; statusCode: number },
    { authToken: string; accountSid: string; phoneNumber: string }
  >(updateSmsSettings);

  const { application, loading: isLoadingApplication, refetch } = useApplication();

  const { data: apiKeys, isLoading: isLoadingApiKeys } = useQuery<{ key: string }[]>('getApiKeys', getApiKeys);
  const embedCode = `
<script>
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
</script>
  `;

  useEffect(() => {
    const params = new URLSearchParams(location.search);

    if (params.get('screen') && params.get('screen') === 'sms') {
      setSelectedTab('sms');
    }
  }, [location]);
  async function onEmailSettingsSubmit({ senderEmail, senderName }) {
    await changeEmailSettings({
      senderEmail,
      senderName,
    });
    refetch();

    message.success('Successfully updated email settings');
  }

  async function onSmsSettingsSubmit({ authToken, accountSid, phoneNumber }) {
    await updateSmsSettingsMutation({
      authToken,
      accountSid,
      phoneNumber,
    });
    refetch();

    message.success('Successfully updated sms settings');
  }

  return (
    <>
      <PageHeader title="Widget Settings" />

      <Tabs defaultActiveKey="0" centered activeKey={selectedTab} onChange={(tab) => setSelectedTab(tab)}>
        <TabPane tab="Branding" key="0">
          <BrandingForm isLoading={isLoadingApplication} application={application} />
        </TabPane>
        <TabPane tab="In App Center" key="1">
          <Card bordered title="In-app widget embed code" loading={isLoadingApplication}>
            <p>
              Copy this snippet to your code before the closing <b>body</b> tag. Change the #notification-bell selector
              with the appropriate bell css selector in your app layout.
            </p>
            <SyntaxHighlighter language="html" style={atomDark} data-test-id="embed-code-snippet">
              {embedCode}
            </SyntaxHighlighter>
          </Card>
        </TabPane>
        <TabPane tab="Email settings" key="2">
          <Card bordered title="Sender Identity">
            <Form
              name="basic"
              onFinish={onEmailSettingsSubmit}
              initialValues={{
                senderEmail: application?.channels?.email?.senderEmail || '',
                senderName: application?.channels?.email?.senderName || '',
              }}>
              <Form.Item
                label="Sender Email"
                name="senderEmail"
                rules={[
                  { required: true, message: 'Please input a valid email' },
                  { type: 'email', message: 'Please provide a valid email' },
                ]}>
                <Input data-test-id="sender-email" />
              </Form.Item>
              <Form.Item
                label="Sender Name"
                name="senderName"
                rules={[{ required: true, message: 'Please enter a sender name' }]}>
                <Input data-test-id="sender-name" />
              </Form.Item>
              <Form.Item>
                <Button
                  loading={isLoadingEmailSettings}
                  type="primary"
                  htmlType="submit"
                  style={{ float: 'right' }}
                  data-test-id="submit-update-settings">
                  Update
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>
        <TabPane tab="SMS" key="sms">
          <Card bordered title="Twillio integration details">
            <Form
              name="basic"
              onFinish={onSmsSettingsSubmit}
              initialValues={{
                authToken: application?.channels?.sms?.twillio?.authToken || '',
                accountSid: application?.channels?.sms?.twillio?.accountSid || '',
                phoneNumber: application?.channels?.sms?.twillio?.phoneNumber || '',
              }}>
              <Form.Item
                label="Account SID"
                name="accountSid"
                rules={[{ required: true, message: 'Please input a valid account sid' }]}>
                <Input data-test-id="account-sid" />
              </Form.Item>
              <Form.Item
                label="Auth Token"
                name="authToken"
                rules={[{ required: true, message: 'Please enter auth token' }]}>
                <Input data-test-id="auth-token" />
              </Form.Item>
              <Form.Item
                label="Phone Number"
                name="phoneNumber"
                rules={[{ required: true, message: 'Please enter a phone number' }]}>
                <Input data-test-id="phone-number" />
              </Form.Item>
              <Form.Item>
                <Button
                  loading={isLoadingSmsSettings}
                  type="primary"
                  htmlType="submit"
                  style={{ float: 'right' }}
                  data-test-id="submit-update-settings">
                  Update
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>
        <TabPane tab="Api Keys" key="3">
          <Card bordered title="Api keys" style={{ marginBottom: 15 }} loading={isLoadingApiKeys}>
            <p>Use this api key to interact with the notifire api</p>
            <div style={{ display: 'flex' }}>
              <Typography.Paragraph copyable code data-test-id="api-key-container">
                {apiKeys?.length ? apiKeys[0].key : ''}
              </Typography.Paragraph>
            </div>
          </Card>
        </TabPane>
      </Tabs>
    </>
  );
}
