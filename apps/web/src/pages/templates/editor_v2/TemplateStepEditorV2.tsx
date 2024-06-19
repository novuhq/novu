import { Button } from '@novu/novui';
import { IconPlayArrow } from '@novu/novui/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ROUTES } from '../../../constants/routes';
import { WorkflowsPageTemplate, WorkflowsPanelLayout } from '../../../studio/components/workflows/layout';
import { WorkflowStepEditorContentPanel } from '../../../studio/components/workflows/step-editor/WorkflowStepEditorContentPanel';
import { WorkflowStepEditorInputsPanel } from '../../../studio/components/workflows/step-editor/WorkflowStepEditorInputsPanel';
import { useTemplateController } from '../components/useTemplateController';
import { api } from '../../../api';
import { WORKFLOW_NODE_STEP_ICON_DICTIONARY } from '../../../studio/components/workflows/node-view/WorkflowNodes';

export const WorkflowsStepEditorPageV2 = () => {
  const [inputs, setStepInputs] = useState({});
  const [payload, setPayload] = useState({});
  const { templateId = '', stepId = '' } = useParams<{ templateId: string; stepId: string }>();
  const { template: workflow } = useTemplateController(templateId);
  const step = (workflow?.steps as any)?.find((item) => item.stepId === stepId);

  const { isLoading, data: inputVariables } = useQuery(
    ['inputs', workflow?.name, stepId],
    () => api.get(`/v1/echo/inputs/${workflow?.name}/${stepId}`),
    {
      enabled: !!workflow,
    }
  );

  const { mutateAsync: saveInputs, isLoading: isSavingInputs } = useMutation((data) =>
    api.put('/v1/echo/inputs/' + workflow?.name + '/' + stepId, { variables: data })
  );

  const {
    data: preview,
    isLoading: loadingPreview,
    mutateAsync: renderStepPreview,
  } = useMutation<any, any, any>((data) => api.post('/v1/echo/preview/' + workflow?.name + '/' + stepId, data));

  const title = step?.stepId;

  const navigate = useNavigate();
  const handleTestClick = () => {
    // TODO: this is just a temporary step for connecting the prototype
    navigate(ROUTES.STUDIO_FLOWS_TEST_STEP);
  };

  useEffect(() => {
    if (!workflow) return;

    renderStepPreview({ inputs, payload });
  }, [inputs, payload, renderStepPreview, workflow]);

  function onInputsChange(type: string, form: any) {
    switch (type) {
      case 'step':
        setStepInputs(form.formData);
        break;
      case 'payload':
        setPayload(form.formData);
        break;
    }
  }

  function onInputsSave() {
    saveInputs(inputs as any);
  }

  const Icon = WORKFLOW_NODE_STEP_ICON_DICTIONARY[step?.template?.type];

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
        <WorkflowStepEditorContentPanel step={step} preview={preview} isLoadingPreview={loadingPreview} />
        <WorkflowStepEditorInputsPanel
          isLoadingSave={isSavingInputs}
          onSave={() => {
            onInputsSave();
          }}
          step={{
            inputs: step?.template?.inputs,
            code: step?.code,
          }}
          workflow={{
            options: {
              payloadSchema: workflow?.payloadSchema,
            },
          }}
          defaultInputs={inputVariables?.inputs || {}}
          onChange={onInputsChange}
        />
      </WorkflowsPanelLayout>
    </WorkflowsPageTemplate>
  );
};
