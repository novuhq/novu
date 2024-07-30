import { IconPlayArrow } from '@novu/novui/icons';
import type { DiscoverWorkflowOutput } from '@novu/framework';
import { css, cx } from '@novu/novui/css';
import { HStack } from '@novu/novui/jsx';

import { WorkflowsPageHeader, WorkflowsPanelLayout } from '../../../studio/components/workflows/layout';
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
    isStateless,
  } = useWorkflowStepEditor(props.stepId);
  const title = step?.stepId;
  const controlsPanelClass = css({
    marginTop: '12px',
  });
  const titleClass = css({});
  const workflowsPageTemplate = css({
    paddingBlock: '0px 0px',
    bg: 'transparent',
  });

  return (
    <>
      <WorkflowsPanelLayout>
        <div>
          <HStack
            className={cx(
              css({ marginTop: '8px', marginBottom: '8px', height: 'inherit', borderRadius: '0 8px 8px 0' })
            )}
          >
            <When truthy={isStateless}>
              <BackButton
                styles={{
                  paddingLeft: '0',
                  paddingRight: '0',
                  _hover: { '& p, & svg': { color: 'typography.text.main !important' } },
                }}
                onClick={() => {
                  props.handleGoBack?.();
                }}
              />
            </When>

            <When truthy={!isStateless}>
              <WorkflowsPageHeader
                className={cx(workflowsPageTemplate, isStateless && titleClass)}
                title={title}
                icon={<Icon size={isStateless ? '19' : '32'} stepType={step?.type} />}
                actions={
                  <When truthy={!isStateless}>
                    <OutlineButton Icon={IconPlayArrow} onClick={handleTestClick}>
                      Test workflow
                    </OutlineButton>
                  </When>
                }
              />
            </When>
          </HStack>
          <WorkflowStepEditorContentPanel
            source={'dashboard'}
            error={error}
            step={step}
            preview={preview}
            isLoadingPreview={loadingPreview}
            onlyPreviewView={isStateless}
          />
        </div>
        <WorkflowStepEditorControlsPanel
          isLoadingSave={isSavingControls}
          step={step?.template}
          workflow={workflow}
          defaultControls={controls || step?.controls || {}}
          onChange={onControlsChange}
          className={cx(isStateless && controlsPanelClass)}
        />
      </WorkflowsPanelLayout>
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
