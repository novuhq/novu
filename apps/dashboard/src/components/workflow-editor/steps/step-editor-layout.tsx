import { WorkflowResponseDto, StepResponseDto } from '@novu/shared';
import { cn } from '@/utils/ui';
import { RiCodeBlock, RiEdit2Line, RiEyeLine } from 'react-icons/ri';
import { StepIssuesPanel } from '@/components/workflow-editor/steps/step-issues-panel';
import { StepEditorFactory } from '@/components/workflow-editor/steps/editor/step-editor-factory';
import { StepPreviewFactory } from '@/components/workflow-editor/steps/preview/step-preview-factory';
import { ResizableLayout } from '@/components/workflow-editor/steps/layout/resizable-layout';
import { PanelHeader } from '@/components/workflow-editor/steps/layout/panel-header';
import { StepIcon, getEditorTitle } from '@/components/workflow-editor/steps/utils/step-utils';
import { StepEditorProvider, useStepEditor } from '@/components/workflow-editor/steps/context/step-editor-context';
import { PreviewContextContainer } from '@/components/workflow-editor/steps/context/preview-context-container';

type StepEditorLayoutProps = {
  workflow: WorkflowResponseDto;
  step: StepResponseDto;
  className?: string;
};

function StepEditorContent() {
  const { step, isSubsequentLoad } = useStepEditor();
  const editorTitle = getEditorTitle(step.type);

  return (
    <ResizableLayout autoSaveId="step-editor-main-layout">
      <ResizableLayout.ContextPanel>
        <PanelHeader icon={RiCodeBlock} title="Preview Context" />
        <div className="bg-bg-weak flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto">
            <PreviewContextContainer />
          </div>
        </div>
      </ResizableLayout.ContextPanel>

      <ResizableLayout.Handle />

      <ResizableLayout.MainContentPanel>
        <div className="flex min-h-0 flex-1 flex-col">
          <ResizableLayout autoSaveId="step-editor-content-layout">
            <ResizableLayout.EditorPanel>
              <PanelHeader icon={() => <RiEdit2Line />} title={editorTitle} />
              <div className="flex-1 overflow-y-auto">
                <div className="h-full p-3">
                  <StepEditorFactory />
                </div>
              </div>
            </ResizableLayout.EditorPanel>

            <ResizableLayout.Handle />

            <ResizableLayout.PreviewPanel>
              <PanelHeader icon={RiEyeLine} title="Preview" isLoading={isSubsequentLoad} />
              <div className="flex-1 overflow-hidden">
                <div
                  className="bg-bg-weak relative h-full overflow-y-auto p-3"
                  style={{
                    backgroundImage: 'radial-gradient(circle, hsl(var(--neutral-alpha-100)) 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }}
                >
                  <StepPreviewFactory />
                </div>
              </div>
            </ResizableLayout.PreviewPanel>
          </ResizableLayout>
        </div>

        <StepIssuesPanel step={step} />
      </ResizableLayout.MainContentPanel>
    </ResizableLayout>
  );
}

export function StepEditorLayout({ workflow, step, className }: StepEditorLayoutProps) {
  return (
    <div className={cn('h-full w-full', className)}>
      <StepEditorProvider workflow={workflow} step={step}>
        <StepEditorContent />
      </StepEditorProvider>
    </div>
  );
}
