import { Prism } from '@mantine/prism';
import { Tabs } from '@novu/novui';
import { IconOutlineCode, IconVisibility } from '@novu/novui/icons';
import { FC, useMemo } from 'react';
import { PreviewWeb } from '../../../../components/workflow/preview/email/PreviewWeb';
import { useActiveIntegrations } from '../../../../hooks/index';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { bridgeApi } from '../../../../api/bridge/bridge.api';
import {
  ChatPreview,
  ChatPreviewComponent,
  EmailPreview,
  InAppPreview,
  InAppPreviewComponent,
  PushPreview,
  SmsPreview,
  SmsPreviewComponent,
} from '../../../../components/workflow/preview';
import { PreviewComponent } from '../../../../pages/templates/components/ChannelPreview';
import { ChatContent } from '../../../../components/workflow/preview/chat/ChatContent';
import { StepTypeEnum } from '@novu/shared';
import { TemplateCustomEditor } from '../../../../pages/templates/components/custom-editor/TemplateCustomEditor';
import { PushPreviewComponent } from '../../../../components/workflow/preview/push/Content';
import { MobileSimulator } from '../../../../components/workflow/preview/common';
import { Center } from '@novu/novui/jsx';

interface IWorkflowStepEditorContentPanelProps {
  preview: any;
  isLoadingPreview: boolean;
  error?: any;
  step: any;
}

export const WorkflowStepEditorContentPanel: FC<IWorkflowStepEditorContentPanelProps> = ({
  preview,
  isLoadingPreview,
  error,
  step,
}) => {
  const tabs = [
    {
      icon: <IconVisibility />,
      value: 'preview',
      label: 'Preview',
      content: (
        <Center>
          <PreviewStep
            channel={step.template?.type || step.type}
            preview={preview}
            loadingPreview={isLoadingPreview}
            error={error}
          />
        </Center>
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
export const PreviewStep = ({
  channel,
  preview,
  loadingPreview,
  error,
}: {
  channel: StepTypeEnum;
  preview: any;
  loadingPreview: boolean;
  error?: any;
}) => {
  const { integrations = [] } = useActiveIntegrations();
  const integration = useMemo(() => {
    return integrations.find((item) => item.channel === 'email' && item.primary) || null;
  }, [integrations]);

  switch (channel) {
    case StepTypeEnum.EMAIL:
      return (
        <PreviewWeb
          integration={integration}
          content={preview?.outputs?.body}
          subject={preview?.outputs?.subject}
          onLocaleChange={() => {}}
          locales={[]}
          loading={loadingPreview}
        />
      );

    case StepTypeEnum.SMS:
      return (
        <SmsPreviewComponent
          locales={[]}
          onLocaleChange={() => {}}
          content={preview?.outputs?.body}
          loading={loadingPreview}
          previewError={error}
        />
      );

    case StepTypeEnum.IN_APP:
      return (
        <InAppPreviewComponent
          locales={[]}
          onLocaleChange={() => {}}
          content={{ content: preview?.outputs?.body, ctaButtons: [] }}
          loading={loadingPreview}
          previewError={error}
        />
      );

    case StepTypeEnum.CHAT:
      return (
        <ChatPreviewComponent
          locales={[]}
          onLocaleChange={() => {}}
          content={preview?.outputs?.body}
          loading={loadingPreview}
          previewError={error}
        />
      );

    case StepTypeEnum.PUSH:
      return (
        <MobileSimulator withBackground>
          <PushPreviewComponent
            locales={[]}
            onLocaleChange={() => {}}
            loading={loadingPreview}
            previewError={error}
            title={preview?.outputs?.subject}
            content={preview?.outputs?.body}
          />
        </MobileSimulator>
      );

    case StepTypeEnum.CUSTOM:
      return <TemplateCustomEditor />;

    default:
      return <>Unknown Step</>;
  }
};
