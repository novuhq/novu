import { IconPlayArrow } from '@novu/novui/icons';
import type { DiscoverWorkflowOutput } from '@novu/framework';
import { css, cx } from '@novu/novui/css';
import { HStack } from '@novu/novui/jsx';

import {
  WorkflowsPageHeader,
  WorkflowsPageTemplate,
  WorkflowsPanelLayout,
} from '../../../studio/components/workflows/layout';
import { WorkflowStepEditorContentPanel } from '../../../studio/components/workflows/step-editor/WorkflowStepEditorContentPanel';
import { WorkflowStepEditorControlsPanel } from '../../../studio/components/workflows/step-editor/WorkflowStepEditorControlsPanel';
import { WORKFLOW_NODE_STEP_ICON_DICTIONARY } from '../../../studio/components/workflows/node-view/WorkflowNodes';
import { OutlineButton } from '../../../studio/components/OutlineButton';
import { useWorkflowStepEditor } from './useWorkflowStepEditor';
import { When } from '../../../components/utils/When';
import { BackButton } from '../../../components/layout/components/LocalStudioHeader/BackButton';

export const WorkflowsStepEditorPageV2 = (props: {
  stepId?: string;
  workflow?: DiscoverWorkflowOutput;
  handleGoBack?: () => void;
}) => {
  const {
    step,
    preview,
    loadingPreview,
    isSavingControls,
    error,
    handleTestClick,
    onControlsChange,
    controls,
    workflow,
  } = useWorkflowStepEditor(props.stepId);
  const title = step?.stepId;

  return (
    <>
      <WorkflowsPageTemplate
        title={title}
        icon={<Icon stepType={step?.type} size="32" />}
        actions={
          <>
            <OutlineButton Icon={IconPlayArrow} onClick={handleTestClick}>
              Test workflow
            </OutlineButton>
          </>
        }
      >
        <WorkflowsPanelLayout>
          <WorkflowStepEditorContentPanel
            source={'dashboard'}
            error={error}
            step={step}
            preview={preview}
            isLoadingPreview={loadingPreview}
          />
          <WorkflowStepEditorControlsPanel
            isLoadingSave={isSavingControls}
            step={step?.template}
            workflow={workflow}
            defaultControls={controls || step?.controls || {}}
            onChange={onControlsChange}
          />
        </WorkflowsPanelLayout>
      </WorkflowsPageTemplate>
    </>
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
