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
  preview: any;
  isLoadingPreview: boolean;
}

export const WorkflowStepEditorContentPanel: FC<IWorkflowStepEditorContentPanelProps> = ({
  preview,
  isLoadingPreview,
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

  const tabs = [
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
          loading={isLoadingPreview}
        />
      ),
    },
  ];

  if (step?.code) {
    tabs.push({
      icon: <IconOutlineCode />,
      value: 'code',
      label: 'Code',
      content: (
        <Prism withLineNumbers language="javascript">
          {step?.code || ''}
        </Prism>
      ),
    });
  }

  return <Tabs defaultValue="preview" tabConfigs={tabs} />;
};
