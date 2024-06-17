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
  preview: any;
  loadingPreview: boolean;
}

export const WorkflowStepEditorContentPanel: FC<IWorkflowStepEditorContentPanelProps> = ({
  preview,
  loadingPreview,
}) => {
  const { templateId = '', stepId = '' } = useParams<{ templateId: string; stepId: string }>();

  const { data: workflow, isLoading } = useQuery(['workflow', templateId], async () => {
    return bridgeApi.getWorkflow(templateId);
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
              {step?.code || ''}
            </Prism>
          ),
        },
      ]}
    />
  );
};
