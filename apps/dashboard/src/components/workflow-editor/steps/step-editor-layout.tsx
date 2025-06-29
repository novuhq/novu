import { WorkflowResponseDto, StepResponseDto, PermissionsEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import { cn } from '@/utils/ui';
import { RiCodeBlock, RiEdit2Line, RiEyeLine, RiPlayCircleLine } from 'react-icons/ri';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { StepIssuesPanel } from '@/components/workflow-editor/steps/step-issues-panel';
import { StepEditorFactory } from '@/components/workflow-editor/steps/editor/step-editor-factory';
import { StepPreviewFactory } from '@/components/workflow-editor/steps/preview/step-preview-factory';
import { ResizableLayout } from '@/components/workflow-editor/steps/layout/resizable-layout';
import { PanelHeader } from '@/components/workflow-editor/steps/layout/panel-header';
import { getEditorTitle } from '@/components/workflow-editor/steps/utils/step-utils';
import { StepEditorProvider, useStepEditor } from '@/components/workflow-editor/steps/context/step-editor-context';
import { PreviewContextContainer } from '@/components/workflow-editor/steps/context/preview-context-container';
import { Button } from '@/components/primitives/button';
import { TestWorkflowDrawer } from '@/components/workflow-editor/test-workflow/test-workflow-drawer';
import { useFetchWorkflowTestData } from '@/hooks/use-fetch-workflow-test-data';
import { Protect } from '../../../utils/protect';
import { parseJsonValue } from '@/components/workflow-editor/steps/utils/preview-context.utils';
import { LocaleSelect } from '@/components/primitives/locale-select';
import { useFetchTranslations, type FetchTranslationsParams } from '@/hooks/use-fetch-translations';
import { useFeatureFlag } from '@/hooks/use-feature-flag';

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
  const isTranslationsEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_TRANSLATION_ENABLED);

  // Fetch translations for the current workflow
  const { data: translationsData } = useFetchTranslations({
    resourceId: workflow._id,
    resourceType: 'workflow' as FetchTranslationsParams['resourceType'],
    enabled: isTranslationsEnabled,
  });

  // Extract available locales from translations
  const availableLocales = translationsData?.data?.map((translation) => translation.locale) || [];

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
              <PanelHeader icon={() => <RiEdit2Line />} title={editorTitle} />
              <div className="flex-1 overflow-y-auto">
                <div className="h-full p-3">
                  <StepEditorFactory />
                </div>
              </div>
            </ResizableLayout.EditorPanel>

            <ResizableLayout.Handle />

            <ResizableLayout.PreviewPanel>
              <PanelHeader icon={RiEyeLine} title="Preview" isLoading={isSubsequentLoad}>
                {isTranslationsEnabled && availableLocales.length > 0 && (
                  <LocaleSelect
                    value={selectedLocale}
                    onChange={setSelectedLocale}
                    placeholder="Select locale"
                    availableLocales={availableLocales}
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

        <StepIssuesPanel step={step} />
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
