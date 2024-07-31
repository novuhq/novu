import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTemplateController } from '../components/useTemplateController';
import { parseUrl } from '../../../utils/routeUtils';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../../../api/api.client';
import { ROUTES } from '../../../constants/routes';
import { errorMessage, successMessage } from '@novu/design-system';
import { WorkflowsStepEditor } from '../../../studio/components/workflows/index';
import { useControlsHandler } from '../../../hooks/workflow/useControlsHandler';

export const WorkflowsStepEditorPageV2 = () => {
  const navigate = useNavigate();
  const { templateId = '', stepId: paramStepId = '' } = useParams<{ templateId: string; stepId: string }>();
  const { template } = useTemplateController(templateId);
  const currentWorkflow = template;
  const currentStepId = paramStepId;

  let step = (currentWorkflow?.steps as any)?.find((item) => item.stepId === currentStepId);
  step = step?.template ? step : { ...step, template: step };

  const {
    data: controlVariables,
    isInitialLoading,
    refetch,
  } = useQuery(
    ['controls', currentWorkflow?.name, currentStepId],
    () => api.get(`/v1/bridge/controls/${currentWorkflow?.name}/${currentStepId}`),
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
    (data) => api.post('/v1/bridge/preview/' + template?.name + '/' + currentStepId, data),
    currentWorkflow?.name as string,
    currentStepId,
    'dashboard'
  );

  const { mutateAsync: saveControls, isLoading: isSavingControls } = useMutation((data) =>
    api.put('/v1/bridge/controls/' + template?.name + '/' + currentStepId, { variables: data })
  );

  useEffect(() => {
    if (!currentWorkflow) return;
    if (!isInitialLoading) {
      setControls(controlVariables?.controls || controlVariables?.inputs);
    }
  }, [currentWorkflow, isInitialLoading, controlVariables, setControls]);

  const handleTestClick = async () => {
    navigate(parseUrl(ROUTES.WORKFLOWS_V2_TEST, { workflowId: templateId }));
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
    <WorkflowsStepEditor
      workflow={template}
      step={{ stepId: step.stepId, ...step.template }}
      preview={preview}
      loadingPreview={loadingPreview}
      isSavingControls={isSavingControls}
      error={error}
      defaultControls={controlVariables?.controls || controlVariables?.inputs || {}}
      onControlsChange={onControlsChange}
      onTestClick={handleTestClick}
      onControlsSave={onControlsSave}
    />
  );
};
