import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { WorkflowsPageTemplate, WorkflowsPanelLayout } from '../../../studio/components/workflows/layout';
import { WorkflowStepEditorContentPanel } from '../../../studio/components/workflows/step-editor/WorkflowStepEditorContentPanel';
import { WorkflowStepEditorControlsPanel } from '../../../studio/components/workflows/step-editor/WorkflowStepEditorControlsPanel';
import { useTemplateController } from '../components/useTemplateController';
import { api } from '../../../api';
import { WORKFLOW_NODE_STEP_ICON_DICTIONARY } from '../../../studio/components/workflows/node-view/WorkflowNodes';

export const WorkflowsStepEditorPageV2 = () => {
  const [controls, setStepControls] = useState({});
  const [payload, setPayload] = useState({});
  const { templateId = '', stepId = '' } = useParams<{ templateId: string; stepId: string }>();
  const { template: workflow } = useTemplateController(templateId);
  const step = (workflow?.steps as any)?.find((item) => item.stepId === stepId);

  const { data: controlVariables } = useQuery(
    ['controls', workflow?.name, stepId],
    () => api.get(`/v1/bridge/controls/${workflow?.name}/${stepId}`),
    {
      enabled: !!workflow,
    }
  );

  const { mutateAsync: saveControls, isLoading: isSavingControls } = useMutation((data) =>
    api.put('/v1/bridge/controls/' + workflow?.name + '/' + stepId, { variables: data })
  );

  const {
    data: preview,
    isLoading: loadingPreview,
    mutateAsync: renderStepPreview,
    error,
  } = useMutation<any, any, any>((data) => api.post('/v1/bridge/preview/' + workflow?.name + '/' + stepId, data));

  const title = step?.stepId;

  useEffect(() => {
    if (!workflow) return;

    renderStepPreview({
      inputs: controls,
      controls,
      payload,
    });
  }, [controls, payload, renderStepPreview, workflow]);

  function onControlsChange(type: string, form: any) {
    switch (type) {
      case 'step':
        setStepControls(form.formData);
        break;
      case 'payload':
        setPayload(form.formData);
        break;
    }
  }

  function onControlsSave() {
    saveControls(controls as any);
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
        <WorkflowStepEditorContentPanel error={error} step={step} preview={preview} isLoadingPreview={loadingPreview} />
        <WorkflowStepEditorControlsPanel
          isLoadingSave={isSavingControls}
          onSave={onControlsSave}
          step={step}
          workflow={workflow}
          defaultControls={controlVariables?.controls || controlVariables?.inputs || {}}
          onChange={onControlsChange}
        />
      </WorkflowsPanelLayout>
    </WorkflowsPageTemplate>
  );
};
