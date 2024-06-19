import { Button } from '@novu/novui';
import { IconOutlineEmail, IconPlayArrow } from '@novu/novui/icons';
import { useParams } from 'react-router-dom';
import { WorkflowsPageTemplate, WorkflowsPanelLayout } from '../layout/index';
import { WorkflowStepEditorContentPanel } from './WorkflowStepEditorContentPanel';
import { WorkflowStepEditorInputsPanel } from './WorkflowStepEditorInputsPanel';
import { useMutation, useQuery } from '@tanstack/react-query';
import { bridgeApi } from '../../../../api/bridge/bridge.api';
import { useState } from 'react';
import { errorMessage, successMessage } from '@novu/design-system';
import { testSendEmailMessage } from '../../../../api/notification-templates';
import { useAuth } from '../../../../hooks/useAuth';
import { ChannelTypeEnum } from '@novu/shared';

export const WorkflowsStepEditorPage = () => {
  const { currentUser } = useAuth();
  const [inputs, setStepInputs] = useState({});
  const [payload, setPayload] = useState({});
  const { templateId = '', stepId = '' } = useParams<{ templateId: string; stepId: string }>();

  const { data: workflow, isLoading } = useQuery(['workflow', templateId], async () => {
    return bridgeApi.getWorkflow(templateId);
  });

  const {
    data: preview,
    isLoading: loadingPreview,
    refetch,
  } = useQuery(['workflow-preview', templateId, stepId, inputs, payload], async () => {
    return bridgeApi.getStepPreview(templateId, stepId, payload, inputs);
  });
  const step = workflow?.steps.find((item) => item.stepId === stepId);
  const title = step?.stepId;
  const stepType: ChannelTypeEnum | undefined = step?.type;

  const { mutateAsync: testSendEmailEvent, isLoading: isTestingEmail } = useMutation(testSendEmailMessage);

  const handleTestClick = async () => {
    try {
      await testSendEmailEvent({
        stepId,
        workflowId: workflow.workflowid,
        contentType: 'customHtml',
        subject: '',
        payload,
        inputs,
        to: currentUser?.email || '',
        bridge: true,
        content: '',
      });
      successMessage('Test sent successfully!');
    } catch (e: any) {
      errorMessage(e.message || 'Un-expected error occurred');
    }
  };

  function onInputsChange(type: string, form: any) {
    switch (type) {
      case 'step':
        setStepInputs(form.formData);
        break;
      case 'payload':
        setPayload(form.formData);
        break;
    }

    refetch();
  }

  return (
    <WorkflowsPageTemplate
      title={title}
      icon={<IconOutlineEmail size="32" />}
      actions={
        stepType === ChannelTypeEnum.EMAIL ? (
          <Button loading={isTestingEmail} Icon={IconPlayArrow} variant="outline" onClick={handleTestClick}>
            Test step
          </Button>
        ) : null
      }
    >
      <WorkflowsPanelLayout>
        <WorkflowStepEditorContentPanel preview={preview} loadingPreview={loadingPreview} />
        <WorkflowStepEditorInputsPanel step={step} workflow={workflow} onChange={onInputsChange} />
      </WorkflowsPanelLayout>
    </WorkflowsPageTemplate>
  );
};
