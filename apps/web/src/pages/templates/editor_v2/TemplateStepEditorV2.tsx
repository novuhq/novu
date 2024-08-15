import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { WorkflowsPageTemplate, WorkflowsPanelLayout } from '../../../studio/components/workflows/layout';
import { WorkflowStepEditorContentPanel } from '../../../studio/components/workflows/step-editor/WorkflowStepEditorContentPanel';
import { WorkflowStepEditorControlsPanel } from '../../../studio/components/workflows/step-editor/WorkflowStepEditorControlsPanel';
import { useTemplateController } from '../components/useTemplateController';
import { api } from '../../../api';
import { WORKFLOW_NODE_STEP_ICON_DICTIONARY } from '../../../studio/components/workflows/node-view/WorkflowNodes';
import { errorMessage, successMessage } from '../../../utils/notifications';
import { IconPlayArrow } from '@novu/novui/icons';
import { ROUTES } from '../../../constants/routes';
import { parseUrl } from '../../../utils/routeUtils';
import { OutlineButton } from '../../../studio/components/OutlineButton';
import { useTelemetry } from '../../../hooks/useNovuAPI';

export const WorkflowsStepEditorPageV2 = () => {
  const track = useTelemetry();
  const navigate = useNavigate();
  const [controls, setStepControls] = useState({});
  const [payload, setPayload] = useState({});
  const { templateId = '', stepId = '' } = useParams<{ templateId: string; stepId: string }>();
  const { template: workflow } = useTemplateController(templateId);
  const step = (workflow?.steps as any)?.find((item) => item.stepId === stepId);

  const { data: controlVariables, isInitialLoading } = useQuery(
    ['controls', workflow?.name, stepId],
    () => api.get(`/v1/bridge/controls/${workflow?.name}/${stepId}`),
    {
      enabled: !!workflow,
    }
  );

  const { mutateAsync: saveControls, isLoading: isSavingControls } = useMutation((data) =>
    api.put('/v1/bridge/controls/' + workflow?.name + '/' + stepId, { variables: data })
  );

  const handleTestClick = () => {
    navigate(parseUrl(ROUTES.WORKFLOWS_V2_TEST, { templateId }));
  };

  const {
    data: preview,
    isLoading: loadingPreview,
    mutateAsync: renderStepPreview,
    error,
  } = useMutation<any, any, any>((data) => api.post('/v1/bridge/preview/' + workflow?.name + '/' + stepId, data));

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
    });
  }, [controls, payload, renderStepPreview, workflow, isInitialLoading]);

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
          defaultControls={controlVariables?.controls || controlVariables?.inputs || {}}
          onChange={onControlsChange}
        />
      </WorkflowsPanelLayout>
    </WorkflowsPageTemplate>
  );
};
