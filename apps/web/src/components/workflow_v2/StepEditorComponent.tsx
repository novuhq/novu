import { css } from '@novu/novui/css';
import { DiscoverStepOutput } from '@novu/framework';
import { WorkflowsPanelLayout } from '../../studio/components/workflows/layout';
import { WorkflowStepEditorContentPanel } from '../../studio/components/workflows/step-editor/WorkflowStepEditorContentPanel';
import { WorkflowStepEditorControlsPanel } from '../../studio/components/workflows/step-editor/WorkflowStepEditorControlsPanel';
import { getSimplifiedErrorObject } from '../../studio/utils';

export const WorkflowsStepEditor = ({
  source,
  onControlsChange,
  step,
  preview,
  error,
  workflow,
  loadingPreview,
  defaultControls,
  onControlsSave,
  isSavingControls,
}: {
  defaultControls: any;
  preview: any;
  error: any;
  workflow: any;
  loadingPreview: boolean;
  step?: DiscoverStepOutput;
  source?: 'studio' | 'playground' | 'dashboard';
  onControlsChange: (type: string, form: any, id?: string) => void;
  onControlsSave?: () => void;
  isSavingControls?: boolean;
}) => {
  return (
    <>
      <WorkflowsPanelLayout>
        <WorkflowStepEditorContentPanel
          source={source}
          onlyPreviewView={source === 'playground'}
          step={step}
          error={error}
          preview={preview}
          isLoadingPreview={loadingPreview}
        />
        <WorkflowStepEditorControlsPanel
          source={source}
          step={step}
          errors={getSimplifiedErrorObject(error)?.data}
          workflow={workflow}
          onChange={onControlsChange}
          defaultControls={defaultControls}
          className={css({ marginTop: source === 'playground' ? '-40px' : '0' })}
          onSave={onControlsSave}
          isLoadingSave={isSavingControls}
        />
      </WorkflowsPanelLayout>
    </>
  );
};
