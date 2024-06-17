import { Prism } from '@mantine/prism';
import { Tabs } from '@novu/novui';
import { IconOutlineCode, IconVisibility } from '@novu/novui/icons';
import { FC, useMemo } from 'react';
import { PreviewWeb } from '../../../../components/workflow/preview/email/PreviewWeb';
import { useActiveIntegrations } from '../../../../hooks/index';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { bridgeApi } from '../../../../api/bridge/bridge.api';

interface IWorkflowStepEditorContentPanelProps {
  // TODO: Placeholder for real props
  placeholder?: never;
}

export const WorkflowStepEditorContentPanel: FC<IWorkflowStepEditorContentPanelProps> = ({}) => {
  const { templateId = '', stepId = '' } = useParams<{ templateId: string; stepId: string }>();

  const { data: workflow, isLoading } = useQuery(['workflow', templateId], async () => {
    return bridgeApi.getWorkflow(templateId);
  });

  const { data: preview, isLoading: loadingPreview } = useQuery(['workflow-preview', templateId, stepId], async () => {
    return bridgeApi.getStepPreview(templateId, stepId);
  });
  const step = workflow?.steps.find((item) => item.stepId === stepId);

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
              content={preview?.outputs?.body}
              subject={preview?.outputs?.subject}
              onLocaleChange={() => {}}
              locales={[]}
              loading={loadingPreview}
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
