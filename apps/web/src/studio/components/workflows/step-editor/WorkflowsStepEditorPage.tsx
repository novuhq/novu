import { useParams } from 'react-router-dom';
import { WorkflowsPageTemplate, WorkflowsPanelLayout } from '../layout/index';
import { WorkflowStepEditorContentPanel } from './WorkflowStepEditorContentPanel';
import { WorkflowStepEditorControlsPanel } from './WorkflowStepEditorControlsPanel';
import { useWorkflow, useWorkflowPreview } from '../../../hooks/useBridgeAPI';
import { useState } from 'react';
import { WORKFLOW_NODE_STEP_ICON_DICTIONARY } from '../node-view/WorkflowNodes';
import { useTelemetry } from '../../../../hooks/useNovuAPI';

export const WorkflowsStepEditorPage = () => {
  const track = useTelemetry();
  const [controls, setStepControls] = useState({});
  const [payload, setPayload] = useState({});
  const { templateId = '', stepId = '' } = useParams<{ templateId: string; stepId: string }>();

  const { data: workflow } = useWorkflow(templateId, { refetchOnWindowFocus: 'always' });
  const {
    data: preview,
    isLoading: loadingPreview,
    refetch,
    error,
  } = useWorkflowPreview({ workflowId: templateId, stepId, controls, payload });

  const step = workflow?.steps.find((item) => item.stepId === stepId);
  const title = step?.stepId;

  function onControlsChange(type: string, form: any, id?: string) {
    switch (type) {
      case 'step':
        track('Step Controls Changes', {
          key: id,
          origin: 'local',
        });
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
        <WorkflowStepEditorControlsPanel step={step} workflow={workflow} onChange={onControlsChange} />
      </WorkflowsPanelLayout>
    </WorkflowsPageTemplate>
  );
};
