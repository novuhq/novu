import { PermissionsEnum, StepResponseDto, WorkflowResponseDto } from '@novu/shared';
import { useState } from 'react';
import { RiCodeBlock, RiEdit2Line, RiEyeLine, RiPlayCircleLine } from 'react-icons/ri';
import { useParams } from 'react-router-dom';
import { IssuesPanel } from '@/components/issues-panel';
import { Button } from '@/components/primitives/button';
import { LocaleSelect } from '@/components/primitives/locale-select';
import { PreviewContextContainer } from '@/components/workflow-editor/steps/context/preview-context-container';
import { StepEditorProvider, useStepEditor } from '@/components/workflow-editor/steps/context/step-editor-context';
import { StepEditorFactory } from '@/components/workflow-editor/steps/editor/step-editor-factory';
import { PanelHeader } from '@/components/workflow-editor/steps/layout/panel-header';
import { ResizableLayout } from '@/components/workflow-editor/steps/layout/resizable-layout';
import { StepPreviewFactory } from '@/components/workflow-editor/steps/preview/step-preview-factory';
import { parseJsonValue } from '@/components/workflow-editor/steps/utils/preview-context.utils';
import { getEditorTitle } from '@/components/workflow-editor/steps/utils/step-utils';
import { TestWorkflowDrawer } from '@/components/workflow-editor/test-workflow/test-workflow-drawer';
import { WorkflowTranslationStatus } from '@/components/workflow-editor/workflow-translation-status';
import { useFetchTranslationGroup } from '@/hooks/use-fetch-translation-group';
import { useFetchWorkflowTestData } from '@/hooks/use-fetch-workflow-test-data';
import { useIsTranslationEnabled } from '@/hooks/use-is-translation-enabled';
import { LocalizationResourceEnum } from '@/types/translations';
import { cn } from '@/utils/ui';
import { Protect } from '../../../utils/protect';

type StepEditorLayoutProps = {
  workflow: WorkflowResponseDto;
  step: StepResponseDto;
  className?: string;
};

function StepEditorContent() {
  const { step, isSubsequentLoad, editorValue, workflow, selectedLocale, setSelectedLocale } = useStepEditor();
  const editorTitle = getEditorTitle(step.type);
  const { workflowSlug = '' } = useParams<{ workflowSlug: string }>();
  const [isTestDrawerOpen, setIsTestDrawerOpen] = useState(false);
  const { testData } = useFetchWorkflowTestData({ workflowSlug });
  const isTranslationsEnabled = useIsTranslationEnabled();

  // Fetch translation group to get outdated locales status
  const { data: translationGroup } = useFetchTranslationGroup({
    resourceId: workflow.workflowId,
    resourceType: LocalizationResourceEnum.WORKFLOW,
    enabled: isTranslationsEnabled,
  });

  // Extract available locales from translations
  const availableLocales = translationGroup?.locales || [];

  const handleTestWorkflowClick = () => {
    setIsTestDrawerOpen(true);
  };

  const currentPayload = parseJsonValue(editorValue).payload;

  return (
    <ResizableLayout autoSaveId="step-editor-main-layout">
      <ResizableLayout.ContextPanel>
        <PanelHeader icon={RiCodeBlock} title="Preview Context" className="py-2">
          <Protect permission={PermissionsEnum.EVENT_WRITE}>
            <Button
              variant="secondary"
              size="2xs"
              mode="gradient"
              leadingIcon={RiPlayCircleLine}
              onClick={handleTestWorkflowClick}
            >
              Test workflow
            </Button>
          </Protect>
        </PanelHeader>
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
              <PanelHeader icon={() => <RiEdit2Line />} title={editorTitle} className="min-h-[45px] py-2">
                <WorkflowTranslationStatus workflowId={workflow.workflowId} className="h-7 text-xs" />
              </PanelHeader>
              <div className="flex-1 overflow-y-auto">
                <div className="h-full p-3">
                  <StepEditorFactory />
                </div>
              </div>
            </ResizableLayout.EditorPanel>

            <ResizableLayout.Handle />

            <ResizableLayout.PreviewPanel>
              <PanelHeader icon={RiEyeLine} title="Preview" isLoading={isSubsequentLoad} className="min-h-[45px] py-2">
                {isTranslationsEnabled && availableLocales.length > 0 && (
                  <LocaleSelect
                    value={selectedLocale}
                    onChange={setSelectedLocale}
                    placeholder="Select locale"
                    availableLocales={availableLocales}
                    className="h-7 w-auto min-w-[120px] text-xs"
                  />
                )}
              </PanelHeader>
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

        <IssuesPanel issues={step.issues} isTranslationEnabled={workflow.isTranslationEnabled} />
      </ResizableLayout.MainContentPanel>

      <TestWorkflowDrawer
        isOpen={isTestDrawerOpen}
        onOpenChange={setIsTestDrawerOpen}
        testData={testData}
        initialPayload={currentPayload}
      />
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
