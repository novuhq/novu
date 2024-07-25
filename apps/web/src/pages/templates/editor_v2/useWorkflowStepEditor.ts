import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';

import { useTelemetry } from '../../../hooks/useNovuAPI';
import { api } from '../../../api';
import { API_ROOT } from '../../../config';
import { errorMessage, successMessage } from '../../../utils/notifications';
import { ROUTES } from '../../../constants/routes';
import { parseUrl } from '../../../utils/routeUtils';
import { useStudioState } from '../../../studio/StudioStateProvider';
import { useAPIKeys } from '../../../hooks';
import { useTemplateController } from '../components/useTemplateController';
import type { DiscoverWorkflowOutput } from '@novu/framework';
import { useDiscover } from '../../../studio/hooks';

export function useWorkflowStepEditor(stepId?: string) {
  const [controls, setStepControls] = useState({});
  const [payload, setPayload] = useState({});
  const { data: discoverData, isLoading: isDiscoverLoading } = useDiscover();
  const track = useTelemetry();
  const studioState = useStudioState() || {};
  const { apiKey } = useAPIKeys();
  const navigate = useNavigate();
  const { templateId = '', stepId: paramStepId = '' } = useParams<{ templateId: string; stepId: string }>();

  const { workflow, workflowId, steps } = normalizeDiscovery(discoverData);
  const workflowIdentifier = workflowId || templateId;
  const { template } = useTemplateController(workflowIdentifier);
  const isStateless = !!workflow;
  const currentWorkflow = workflow || template;
  const currentStepId = stepId || paramStepId;
  const workflowName = workflow?.workflowId || template?.name;
  const { testUser, bridgeURL } = studioState;
  let step = (currentWorkflow?.steps as any)?.find((item) => item.stepId === currentStepId);
  step = step?.template ? step : { ...step, template: step };

  const { data: controlVariables, isInitialLoading } = useQuery(
    ['controls', workflowName, currentStepId],
    () => api.get(`/v1/bridge/controls/${workflowName}/${currentStepId}`),
    {
      enabled: !!currentWorkflow,
    }
  );

  const { mutateAsync: saveControls, isLoading: isSavingControls } = useMutation((data) =>
    api.put('/v1/bridge/controls/' + workflowName + '/' + currentStepId, { variables: data })
  );

  const handleTestClick = async () => {
    if (isStateless) {
      const res = await fetch(`${API_ROOT}/v1/events/trigger`, {
        method: 'POST',
        body: JSON.stringify({
          bridgeUrl: bridgeURL,
          name: 'hello-world',
          to: { subscriberId: testUser.id, email: testUser.emailAddress },
          payload: { ...payload, __source: 'studio-onboarding-test-workflow' },
          controls: {
            steps: {
              [step?.stepId]: controls,
            },
          },
        }),
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `ApiKey ${apiKey}`,
        },
      });

      return await res.json();
    } else {
      navigate(parseUrl(ROUTES.WORKFLOWS_V2_TEST, { workflowId: workflowIdentifier }));
    }
  };

  const {
    data: preview,
    isLoading: loadingPreview,
    mutateAsync: renderStepPreview,
    error,
  } = useMutation<any, any, any>((data) => api.post('/v1/bridge/preview/' + workflowName + '/' + currentStepId, data));

  useEffect(() => {
    if (!currentWorkflow || isInitialLoading) return;
    setStepControls(controlVariables?.controls || controlVariables?.inputs);
  }, [currentWorkflow, isInitialLoading, controlVariables]);

  useEffect(() => {
    if (!currentWorkflow || isInitialLoading) return;
    renderStepPreview({
      inputs: controls,
      controls,
      payload,
      bridgeUrl: bridgeURL,
    });
  }, [controls, payload, renderStepPreview, currentWorkflow, isInitialLoading, bridgeURL]);

  const onControlsChange = (type: string, form: any, id?: string) => {
    switch (type) {
      case 'step':
        track('Step Controls Changes', {
          key: id,
          origin: 'dashboard',
        });
        setStepControls(form.formData);
        break;
      case 'payload':
        setPayload(form.formData);
        break;
    }
  };

  const onControlsSave = async () => {
    try {
      await saveControls(controls as any);
      successMessage('Successfully saved controls');
    } catch (err: unknown) {
      if (err instanceof Error) {
        errorMessage(err?.message || 'Failed to save controls');
      }
    }
  };

  return {
    isStateless,
    step,
    preview,
    loadingPreview,
    isSavingControls,
    error,
    handleTestClick,
    onControlsChange,
    onControlsSave,
    controls,
    setStepControls,
    payload,
    setPayload,
    workflow: currentWorkflow,
    steps,
    isDiscoverLoading,
  };
}

function normalizeDiscovery(discoverData: { workflows: DiscoverWorkflowOutput[] } | undefined) {
  const workflows = discoverData ? discoverData.workflows : null;
  if (!workflows?.length) {
    return { workflow: null, workflowId: null, steps: null };
  }

  const workflow = workflows[0];
  const workflowId = workflow?.workflowId as string;
  // todo check if needed
  const steps =
    workflow?.steps?.map((item) => {
      return {
        stepId: item.stepId,
        type: item.type,
      };
    }) || [];

  return { workflow, workflowId, steps };
}
