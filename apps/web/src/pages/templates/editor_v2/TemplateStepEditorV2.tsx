import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { errorMessage, IconPlayArrow, successMessage } from '@novu/design-system';
import { useTemplateController } from '../components/useTemplateController';
import { parseUrl } from '../../../utils/routeUtils';
import { api } from '../../../api/api.client';
import { ROUTES } from '../../../constants/routes';
import { useControlsHandler } from '../../../hooks/workflow/useControlsHandler';
import { WorkflowsStepEditor } from '../../../components/workflow_v2/StepEditorComponent';
import { StepIcon, WorkflowsPageTemplate } from '../../../studio/components/workflows/layout/WorkflowsPageTemplate';
import { OutlineButton } from '../../../studio/components/OutlineButton';

export const WorkflowsStepEditorPageV2 = () => {
  const navigate = useNavigate();
  const { templateId = '', stepId: paramStepId = '' } = useParams<{ templateId: string; stepId: string }>();
  const { template } = useTemplateController(templateId);
  const currentWorkflow = template;
  const currentStepId = paramStepId;

  let step = (currentWorkflow?.steps as any)?.find((item) => item.stepId === currentStepId);
  step = step?.template ? step : { ...step, template: step };

  const workflowId = (currentWorkflow?.triggers as any)?.[0]?.identifier;
  const {
    data: controlVariables,
    isInitialLoading,
    refetch,
  } = useQuery(
    ['controls', workflowId, currentStepId],
    () => api.get(`/v1/bridge/controls/${workflowId}/${currentStepId}`),
    {
      enabled: !!currentWorkflow,
    }
  );

  const {
    preview,
    isLoading: loadingPreview,
    error,
    controls,
    setControls,
    onControlsChange,
  } = useControlsHandler(
    (data) => api.post(`/v1/bridge/preview/${workflowId}/${currentStepId}`, data),
    workflowId as string,
    currentStepId,
    'dashboard'
  );

  const { mutateAsync: saveControls, isLoading: isSavingControls } = useMutation((data) =>
    api.put(`/v1/bridge/controls/${workflowId}/${currentStepId}`, { variables: data })
  );

  useEffect(() => {
    if (!currentWorkflow) return;
    if (!isInitialLoading) {
      setControls(controlVariables?.controls || controlVariables?.inputs);
    }
  }, [currentWorkflow, isInitialLoading, controlVariables, setControls]);

  const handleTestClick = async () => {
    navigate(parseUrl(ROUTES.WORKFLOWS_V2_TEST, { templateId }));
  };

  const onControlsSave = async () => {
    try {
      await saveControls(controls as any);
      refetch();
      successMessage('Successfully saved controls');
    } catch (err: unknown) {
      if (err instanceof Error) {
        errorMessage(err?.message || 'Failed to save controls');
      }
    }
  };

  if (isInitialLoading || !template) return null;

  return (
    <WorkflowsPageTemplate
      title={step.stepId}
      icon={<StepIcon type={step?.template?.type} size="32" />}
      actions={
        <OutlineButton Icon={IconPlayArrow} onClick={handleTestClick}>
          Test workflow
        </OutlineButton>
      }
    >
      <WorkflowsStepEditor
        workflow={template}
        step={{ stepId: step.stepId, ...step.template }}
        preview={preview}
        loadingPreview={loadingPreview}
        isSavingControls={isSavingControls}
        error={error}
        defaultControls={controlVariables?.controls || controlVariables?.inputs || {}}
        onControlsChange={onControlsChange}
        onControlsSave={onControlsSave}
      />
    </WorkflowsPageTemplate>
  );
};
