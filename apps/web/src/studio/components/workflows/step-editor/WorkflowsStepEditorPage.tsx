import { useParams } from 'react-router-dom';
import { WorkflowsPageTemplate, WorkflowsPanelLayout } from '../layout/index';
import { WorkflowStepEditorContentPanel } from './WorkflowStepEditorContentPanel';
import { WorkflowStepEditorInputsPanel } from './WorkflowStepEditorInputsPanel';
import { useQuery } from '@tanstack/react-query';
import { bridgeApi } from '../../../../api/bridge/bridge.api';
import { useState } from 'react';
import { WORKFLOW_NODE_STEP_ICON_DICTIONARY } from '../node-view/WorkflowNodes';
import { WorkflowTestStepButton } from './WorkflowTestStepButton';

export const WorkflowsStepEditorPage = () => {
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
    error,
  } = useQuery(['workflow-preview', templateId, stepId, inputs, payload], async () => {
    return bridgeApi.getStepPreview(templateId, stepId, payload, inputs);
  });
  const step = workflow?.steps.find((item) => item.stepId === stepId);
  const title = step?.stepId;

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

  const Icon = WORKFLOW_NODE_STEP_ICON_DICTIONARY[step?.type];

  return (
    <WorkflowsPageTemplate
      title={title}
      icon={<Icon size="32" />}
      actions={
        <WorkflowTestStepButton
          stepId={stepId}
          payload={payload}
          inputs={inputs}
          workflowId={workflow?.workflowId}
          stepType={step?.type}
        />
      }
    >
      <WorkflowsPanelLayout>
        <WorkflowStepEditorContentPanel step={step} error={error} preview={preview} isLoadingPreview={loadingPreview} />
        <WorkflowStepEditorInputsPanel step={step} workflow={workflow} onChange={onInputsChange} />
      </WorkflowsPanelLayout>
    </WorkflowsPageTemplate>
  );
};
