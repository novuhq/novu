import { useParams } from 'react-router-dom';
import { WorkflowsPageTemplate, WorkflowsPanelLayout } from '../layout/index';
import { WorkflowStepEditorContentPanel } from './WorkflowStepEditorContentPanel';
import { WorkflowStepEditorInputsPanel } from './WorkflowStepEditorInputsPanel';
import { useQuery } from '@tanstack/react-query';
import { bridgeApi } from '../../../../api/bridge/bridge.api';
import { useState } from 'react';
import { WORKFLOW_NODE_STEP_ICON_DICTIONARY } from '../node-view/WorkflowNodes';

export const WorkflowsStepEditorPage = () => {
  const [controls, setStepControls] = useState({});
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
  } = useQuery(['workflow-preview', templateId, stepId, controls, payload], async () => {
    return bridgeApi.getStepPreview(templateId, stepId, payload, controls);
  });
  const step = workflow?.steps.find((item) => item.stepId === stepId);
  const title = step?.stepId;

  function onControlsChange(type: string, form: any) {
    switch (type) {
      case 'step':
        setStepControls(form.formData);
        break;
      case 'payload':
        setPayload(form.formData);
        break;
    }

    refetch();
  }

  function Icon({ size }) {
    const IconElement = WORKFLOW_NODE_STEP_ICON_DICTIONARY[step?.type];
    if (!IconElement) {
      return null;
    }

    return (
      <>
        <IconElement size={size} />
      </>
    );
  }

  return (
    <WorkflowsPageTemplate title={title} icon={<Icon size="32" />}>
      <WorkflowsPanelLayout>
        <WorkflowStepEditorContentPanel step={step} error={error} preview={preview} isLoadingPreview={loadingPreview} />
        <WorkflowStepEditorInputsPanel step={step} workflow={workflow} onChange={onControlsChange} />
      </WorkflowsPanelLayout>
    </WorkflowsPageTemplate>
  );
};
