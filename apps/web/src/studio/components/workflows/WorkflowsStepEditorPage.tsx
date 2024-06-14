import { Prism } from '@mantine/prism';
import { Input, Tabs } from '@novu/design-system';
import { Button, Title } from '@novu/novui';
import { css } from '@novu/novui/css';
import {
  IconOutlineCode,
  IconOutlineEditNote,
  IconOutlineEmail,
  IconOutlineTune,
  IconOutlineVisibility,
  IconPlayArrow,
} from '@novu/novui/icons';
import { Flex, HStack } from '@novu/novui/jsx';
import { useMemo, useState } from 'react';
import { PreviewWeb } from '../../../components/workflow/preview/email/PreviewWeb';
import { useActiveIntegrations } from '../../../hooks/index';
import { PageContainer } from '../../layout/PageContainer';
import { PageMeta } from '../../layout/PageMeta';
import { WorkflowsPanelLayout } from './layout';

export const WorkflowsStepEditorPage = () => {
  const title = 'Email step';

  const handleTestClick = () => {};

  const [tab, setTab] = useState<string>('Preview');
  const [content, setContent] = useState<string>('');
  const [subject, setSubject] = useState<string>('');

  const { integrations = [] } = useActiveIntegrations();
  const integration = useMemo(() => {
    return integrations.find((item) => item.channel === 'email' && item.primary) || null;
  }, [integrations]);

  return (
    <PageContainer className={css({ colorPalette: 'mode.local' })}>
      <PageMeta title={title} />
      <Flex justify={'space-between'} mb="100">
        <HStack gap="50">
          <IconOutlineEmail size="32" />
          <Title variant="section">{title}</Title>
        </HStack>
        <HStack gap="100">
          <Button Icon={IconPlayArrow} variant="outline" onClick={handleTestClick}>
            Test workflow
          </Button>
        </HStack>
      </Flex>
      <WorkflowsPanelLayout>
        <Tabs
          withIcon={true}
          value={tab}
          onTabChange={(value) => {
            setTab(value as string);
          }}
          menuTabs={[
            {
              icon: <IconOutlineVisibility />,
              value: 'Preview',
              content: (
                <PreviewWeb
                  integration={integration}
                  content={content}
                  subject={subject}
                  onLocaleChange={() => {}}
                  locales={[]}
                  loading={false}
                  /*
                   * className={css({
                   *   height: '[calc(50vh - 28px) !important]',
                   * })}
                   */
                />
              ),
            },
            {
              icon: <IconOutlineCode />,
              value: 'Code',
              content: (
                <Prism withLineNumbers={true} language="javascript">
                  {`
{
    subject: "Welcome to Novu! Ready to code?",
    body: \`<html xmlns="http://www.w3.org/1999/xhtml">
          <head>
            <title>Notification workflows rooted in how YOU work</title>
            <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 20px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <img width="200px" src="https://web.novu.co/static/images/logo.png" />
            </div>
            <h1 style="margin: 0; margin-bottom: 16px;">Notification workflows rooted in how YOU work</h1>
            <p style="margin: 0; margin-bottom: 8px;">Hi!</p>
            <p style="margin: 0; margin-bottom: 8px;">Good to have you here! We continuously work on giving you the flexibility to
              build any notification setup you need - through code, right from your IDE - and to give your manager an easy way to adjust the notification content. Check
              out our <a href="https://docs.novu.co/echo/quickstart">docs</a> to learn more.</p>
            <p style="margin: 0; margin-bottom: 8px;">Questions or problems? Our <a href="https://discord.com/channels/895029566685462578/1019663407915483176">Discord support channel</a> is here for you.</p>
            <p style="margin: 0; margin-bottom: 8px;">Feedback? Head over to our <a href="https://roadmap.novu.co/roadmap">public roadmap</a> to submit it, or simply poke us on Discord or via email. We’re here to make your life easier!</p>
            <p style="margin: 0;">Cheers,<br />Novu Team</p>
          </body>
        </html>\`,
}`}
                </Prism>
              ),
            },
          ]}
        />
        <Tabs
          withIcon={true}
          value={tab}
          onTabChange={(value) => {
            setTab(value as string);
          }}
          menuTabs={[
            {
              icon: <IconOutlineTune />,
              value: 'Payload',
              content: <Input />,
            },
            {
              icon: <IconOutlineEditNote />,
              value: 'Step inputs',
              content: <Input />,
            },
          ]}
        />
      </WorkflowsPanelLayout>
    </PageContainer>
  );
};
