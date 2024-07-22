import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { IconPlayArrow } from '@novu/novui/icons';
import type { DiscoverWorkflowOutput } from '@novu/framework';
import { INotificationTemplate } from '@novu/shared';

import { WorkflowsPageTemplate, WorkflowsPanelLayout } from '../../../studio/components/workflows/layout';
import { WorkflowStepEditorContentPanel } from '../../../studio/components/workflows/step-editor/WorkflowStepEditorContentPanel';
import { WorkflowStepEditorControlsPanel } from '../../../studio/components/workflows/step-editor/WorkflowStepEditorControlsPanel';
import { useTemplateController } from '../components/useTemplateController';
import { api } from '../../../api';
import { WORKFLOW_NODE_STEP_ICON_DICTIONARY } from '../../../studio/components/workflows/node-view/WorkflowNodes';
import { errorMessage, successMessage } from '../../../utils/notifications';
import { ROUTES } from '../../../constants/routes';
import { parseUrl } from '../../../utils/routeUtils';
import { OutlineButton } from '../../../studio/components/OutlineButton';
import { useTelemetry } from '../../../hooks/useNovuAPI';
import { useStudioState } from '../../../studio/StudioStateProvider';
import { API_ROOT } from '../../../config';
import { useAPIKeys } from '../../../hooks';

export const WorkflowsStepEditorPageV2 = (props: {
  workflowId?: string;
  stepId?: string;
  workflow?: DiscoverWorkflowOutput;
}) => {
  const isStateless = !!props.workflow;
  const track = useTelemetry();
  const navigate = useNavigate();
  const [controls, setStepControls] = useState({});
  const [payload, setPayload] = useState({});
  const { templateId = '', stepId = '' } = useParams<{ templateId: string; stepId: string }>();
  const studioState = useStudioState() || {};
  const { apiKey } = useAPIKeys();

  const workflowId = props.workflowId || templateId;
  const { template } = useTemplateController(workflowId);
  let workflow: DiscoverWorkflowOutput | INotificationTemplate | undefined;
  const workflowStepId = props.stepId || stepId;
  const workflowName = props.workflow?.workflowId || template?.name;
  const { testUser, bridgeURL } = studioState;

  if (props.workflow) {
    workflow = props.workflow;
  } else {
    workflow = template;
  }
  let step = (workflow?.steps as any)?.find((item) => item.stepId === workflowStepId);
  step = step.template ? step : { ...step, template: step };

  const { data: controlVariables, isInitialLoading } = useQuery(
    ['controls', workflowName, workflowStepId],
    () => api.get(`/v1/bridge/controls/${workflowName}/${workflowStepId}`),
    {
      enabled: !!workflow,
    }
  );

  const { mutateAsync: saveControls, isLoading: isSavingControls } = useMutation((data) =>
    api.put('/v1/bridge/controls/' + workflowName + '/' + workflowStepId, { variables: data })
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
      const response = await res.json();
    } else {
      navigate(parseUrl(ROUTES.WORKFLOWS_V2_TEST, { workflowId }));
    }
  };

  const {
    data: preview,
    isLoading: loadingPreview,
    mutateAsync: renderStepPreview,
    error,
  } = useMutation<any, any, any>((data) => api.post('/v1/bridge/preview/' + workflowName + '/' + workflowStepId, data));

  const title = step?.stepId;

  useEffect(() => {
    if (!workflow) return;

    if (!isInitialLoading) {
      setStepControls(controlVariables?.controls);
    }
  }, [workflow, isInitialLoading, controlVariables, setStepControls]);

  useEffect(() => {
    if (!workflow) return;

    if (isInitialLoading) return;

    renderStepPreview({
      inputs: controls,
      controls,
      payload,
      bridgeUrl: bridgeURL,
    });
  }, [controls, payload, renderStepPreview, workflow, isInitialLoading, bridgeURL]);

  function onControlsChange(type: string, form: any, id?: string) {
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
  }

  async function onControlsSave() {
    try {
      await saveControls(controls as any);
      successMessage('Successfully saved controls');
    } catch (err: unknown) {
      if (err instanceof Error) {
        errorMessage(err?.message || 'Failed to save controls');
      }
    }
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
    <WorkflowsPageTemplate
      title={title}
      icon={<Icon size="32" />}
      actions={
        <>
          <OutlineButton Icon={IconPlayArrow} onClick={handleTestClick}>
            Test workflow
          </OutlineButton>
        </>
      }
    >
      <WorkflowsPanelLayout>
        <WorkflowStepEditorContentPanel error={error} step={step} preview={preview} isLoadingPreview={loadingPreview} />
        <WorkflowStepEditorControlsPanel
          isLoadingSave={isSavingControls}
          onSave={onControlsSave}
          step={step?.template}
          workflow={workflow}
          defaultControls={controlVariables?.controls || controlVariables?.inputs || step?.controls || {}}
          onChange={onControlsChange}
        />
      </WorkflowsPanelLayout>
    </WorkflowsPageTemplate>
  );
};
