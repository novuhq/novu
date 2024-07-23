import { IconPlayArrow } from '@novu/novui/icons';
import type { DiscoverWorkflowOutput } from '@novu/framework';

import { WorkflowsPageTemplate, WorkflowsPanelLayout } from '../../../studio/components/workflows/layout';
import { WorkflowStepEditorContentPanel } from '../../../studio/components/workflows/step-editor/WorkflowStepEditorContentPanel';
import { WorkflowStepEditorControlsPanel } from '../../../studio/components/workflows/step-editor/WorkflowStepEditorControlsPanel';
import { WORKFLOW_NODE_STEP_ICON_DICTIONARY } from '../../../studio/components/workflows/node-view/WorkflowNodes';
import { OutlineButton } from '../../../studio/components/OutlineButton';
import { useWorkflowStepEditor } from './useWorkflowStepEditor';

export const WorkflowsStepEditorPageV2 = (props: {
  workflowId?: string;
  stepId?: string;
  workflow?: DiscoverWorkflowOutput;
}) => {
  const {
    step,
    preview,
    loadingPreview,
    isSavingControls,
    error,
    handleTestClick,
    onControlsChange,
    onControlsSave,
    controls,
    workflow,
  } = useWorkflowStepEditor(props);
  const title = step?.stepId;

  return (
    <WorkflowsPageTemplate
      title={title}
      icon={<Icon size="32" stepType={step?.type} />}
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
          defaultControls={controls || step?.controls || {}}
          onChange={onControlsChange}
        />
      </WorkflowsPanelLayout>
    </WorkflowsPageTemplate>
  );
};

function Icon({ size, stepType }) {
  const IconElement = WORKFLOW_NODE_STEP_ICON_DICTIONARY[stepType];
  if (!IconElement) {
    return null;
  }

  return (
    <>
      <IconElement size={size} />
    </>
  );
}
