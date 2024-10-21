import { useParams } from 'react-router-dom';
import { WorkflowsStepEditor } from '../../components/workflow_v2/StepEditorComponent';
import { useControlsHandler } from '../../hooks/workflow/useControlsHandler';
import { StepIcon, WorkflowsPageTemplate } from '../components/workflows/layout/WorkflowsPageTemplate';
import { useBridgeAPI, useWorkflow } from '../hooks/useBridgeAPI';

export const StudioStepEditorPage = () => {
  const bridgeApi = useBridgeAPI();

  const { templateId = '', stepId = '' } = useParams<{
    templateId: string;
    stepId: string;
  }>();

  const { data: workflow } = useWorkflow(templateId, {
    refetchOnWindowFocus: 'always',
  });
  const {
    preview,
    isLoading: loadingPreview,
    error,
    controls,
    onControlsChange,
  } = useControlsHandler((data) => bridgeApi.getStepPreview(data), templateId, stepId, 'studio');

  const step = workflow?.steps.find((item) => item.stepId === stepId);

  return (
    <WorkflowsPageTemplate title={step?.stepId || ''} icon={<StepIcon type={step?.type} size="32" />}>
      <WorkflowsStepEditor
        source="studio"
        step={step}
        onControlsChange={onControlsChange}
        preview={preview}
        error={error}
        workflow={workflow}
        loadingPreview={loadingPreview}
        defaultControls={controls}
      />
    </WorkflowsPageTemplate>
  );
};
