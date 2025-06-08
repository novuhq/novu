import { WorkflowOriginEnum, WorkflowResponseDto, StepResponseDto } from '@novu/shared';
import { cn } from '@/utils/ui';
import { useFormContext } from 'react-hook-form';
import { RiCodeBlock, RiEyeLine } from 'react-icons/ri';
import { useEditorPreview } from '@/components/workflow-editor/steps/use-editor-preview';
import { PreviewContextPanel } from '@/components/workflow-editor/steps/preview-context-panel';
import { StepIssuesPanel } from '@/components/workflow-editor/steps/step-issues-panel';
import { StepEditorFactory } from '@/components/workflow-editor/steps/editor/step-editor-factory';
import { StepPreviewFactory } from '@/components/workflow-editor/steps/preview/step-preview-factory';
import { ResizableLayout } from '@/components/workflow-editor/steps/layout/resizable-layout';
import { PanelHeader } from '@/components/workflow-editor/steps/layout/panel-header';
import { StepIcon, getEditorTitle } from '@/components/workflow-editor/steps/utils/step-utils';

type StepEditorLayoutProps = {
  workflow: WorkflowResponseDto;
  step: StepResponseDto;
  className?: string;
};

function NoPreviewAvailable() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-neutral-500">
      Preview not available for this step configuration
    </div>
  );
}

export function StepEditorLayout({ workflow, step, className }: StepEditorLayoutProps) {
  const form = useFormContext();
  const editorTitle = getEditorTitle(step.type);

  const controlValues = form.watch();
  const { editorValue, setEditorValue, previewData, isPreviewPending } = useEditorPreview({
    workflowSlug: workflow.workflowId,
    stepSlug: step.stepId,
    controlValues,
  });

  const { uiSchema } = step.controls;
  const isNovuCloud = workflow.origin === WorkflowOriginEnum.NOVU_CLOUD && uiSchema;

  const previewContent = isNovuCloud ? (
    <StepPreviewFactory step={step} previewData={previewData} isPreviewPending={isPreviewPending} />
  ) : (
    <NoPreviewAvailable />
  );

  return (
    <div className={cn('h-full w-full', className)}>
      <ResizableLayout>
        <ResizableLayout.ContextPanel>
          <PanelHeader icon={RiCodeBlock} title="Preview Context" />
          <div className="flex-1 overflow-y-auto">
            <PreviewContextPanel
              workflow={workflow}
              value={editorValue}
              onChange={setEditorValue}
              currentStepId={step.stepId}
            />
          </div>
        </ResizableLayout.ContextPanel>

        <ResizableLayout.Handle />

        <ResizableLayout.MainContentPanel>
          <div className="flex-1">
            <ResizableLayout>
              <ResizableLayout.EditorPanel>
                <PanelHeader icon={() => <StepIcon stepType={step.type} />} title={editorTitle} />
                <div className="flex-1 overflow-y-auto p-3">
                  <StepEditorFactory workflow={workflow} step={step} />
                </div>
              </ResizableLayout.EditorPanel>

              <ResizableLayout.Handle />

              <ResizableLayout.PreviewPanel>
                <PanelHeader icon={RiEyeLine} title="Preview" />
                <div
                  className="bg-bg-weak relative flex-1 overflow-y-auto p-3"
                  style={{
                    backgroundImage: 'radial-gradient(circle, hsl(var(--neutral-alpha-100)) 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }}
                >
                  {previewContent}
                </div>
              </ResizableLayout.PreviewPanel>
            </ResizableLayout>
          </div>

          <StepIssuesPanel step={step} />
        </ResizableLayout.MainContentPanel>
      </ResizableLayout>
    </div>
  );
}
