import { Prism } from '@mantine/prism';
import { IconOutlineCode, IconVisibility } from '@novu/novui/icons';
import { Tabs } from '@novu/novui';
import { FC, useMemo } from 'react';
import { PreviewWeb } from '../../../components/workflow/preview/email/PreviewWeb';
import { useActiveIntegrations } from '../../../hooks/index';

interface IWorkflowStepEditorContentPanelProps {
  // TODO: Placeholder for real props
  placeholder?: never;
}

export const WorkflowStepEditorContentPanel: FC<IWorkflowStepEditorContentPanelProps> = ({}) => {
  const { integrations = [] } = useActiveIntegrations();
  const integration = useMemo(() => {
    return integrations.find((item) => item.channel === 'email' && item.primary) || null;
  }, [integrations]);

  return (
    <Tabs
      defaultValue="preview"
      tabConfigs={[
        {
          icon: <IconVisibility />,
          value: 'preview',
          label: 'Preview',
          content: (
            <PreviewWeb
              integration={integration}
              content={'This is a placeholder for real content'}
              subject={'This is a placeholder for a real subject'}
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
          value: 'code',
          label: 'Code',
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
    <body style="font-family: -apple-system, BlinkMacSystemFont">
      <div style="text-align: center; margin-bottom: 24px;">
        <img width="200px" src="https://web.novu.co/static/images/logo.png" />
      </div>
      <h1 style="margin: 0; margin-bottom: 16px;">Notification workflows rooted in how YOU work</h1>
      <p style="margin: 0; margin-bottom: 8px;">Hi!</p>
      <p style="margin: 0;">Cheers,<br />Novu Team</p>
    </body>
  </html>\`,
}`}
            </Prism>
          ),
        },
      ]}
    />
  );
};
