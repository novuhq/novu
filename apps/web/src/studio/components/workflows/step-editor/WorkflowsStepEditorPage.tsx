import { Button } from '@novu/novui';
import { IconPlayArrow } from '@novu/novui/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '../../../../constants/routes';
import { WorkflowsPageTemplate, WorkflowsPanelLayout } from '../layout/index';
import { WorkflowStepEditorContentPanel } from './WorkflowStepEditorContentPanel';
import { WorkflowStepEditorInputsPanel } from './WorkflowStepEditorInputsPanel';
import { useQuery } from '@tanstack/react-query';
import { bridgeApi } from '../../../../api/bridge/bridge.api';
import { useState } from 'react';
import { WORKFLOW_NODE_STEP_ICON_DICTIONARY } from '../node-view/WorkflowNodes';

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

  const navigate = useNavigate();
  const handleTestClick = () => {
    // TODO: this is just a temporary step for connecting the prototype
    navigate(ROUTES.STUDIO_FLOWS_TEST_STEP);
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

  const Icon = WORKFLOW_NODE_STEP_ICON_DICTIONARY[step?.type];

  return (
    <WorkflowsPageTemplate
      title={title}
      icon={<Icon size="32" />}
      actions={
        <Button Icon={IconPlayArrow} variant="outline" onClick={handleTestClick}>
          Test workflow
        </Button>
      }
    >
      <WorkflowsPanelLayout>
        <WorkflowStepEditorContentPanel step={step} error={error} preview={preview} isLoadingPreview={loadingPreview} />
        <WorkflowStepEditorInputsPanel step={step} workflow={workflow} onChange={onInputsChange} />
      </WorkflowsPanelLayout>
    </WorkflowsPageTemplate>
  );
};
