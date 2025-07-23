import { WorkflowResponseDto, EnvironmentTypeEnum, StepResponseDto, PermissionsEnum } from '@novu/shared';
import { cn } from '@/utils/ui';
import { RiCodeBlock, RiEdit2Line, RiEyeLine, RiPlayCircleLine, RiLockLine, RiArrowRightSLine } from 'react-icons/ri';
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { IssuesPanel } from '@/components/issues-panel';
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
import { useEnvironment } from '../../../context/environment/hooks';
import { buildRoute, ROUTES } from '@/utils/routes';
import { useIsTranslationEnabled } from '@/hooks/use-is-translation-enabled';
import { useFetchTranslationGroup } from '@/hooks/use-fetch-translation-group';
import { LocalizationResourceEnum } from '@/types/translations';
import { WorkflowTranslationStatus } from '@/components/workflow-editor/workflow-translation-status';

type StepEditorLayoutProps = {
  workflow: WorkflowResponseDto;
  step: StepResponseDto;
  className?: string;
};

function StepEditorContent() {
  const { currentEnvironment, switchEnvironment, oppositeEnvironment } = useEnvironment();
  const { step, isSubsequentLoad, editorValue, workflow, selectedLocale, setSelectedLocale } = useStepEditor();
  const editorTitle = getEditorTitle(step.type);
  const { workflowSlug = '' } = useParams<{ workflowSlug: string }>();
  const navigate = useNavigate();
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

  const handleSwitchToDevelopment = () => {
    const developmentEnvironment = oppositeEnvironment?.name === 'Development' ? oppositeEnvironment : null;

    if (developmentEnvironment?.slug) {
      switchEnvironment(developmentEnvironment.slug);
      navigate(
        buildRoute(ROUTES.EDIT_WORKFLOW, {
          environmentSlug: developmentEnvironment.slug,
          workflowSlug: workflow.workflowId,
        })
      );
    }
  };

  const currentPayload = parseJsonValue(editorValue).payload;
  const developmentEnvironment = oppositeEnvironment?.name === 'Development' ? oppositeEnvironment : null;

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
              <PanelHeader icon={() => <RiEdit2Line />} title={editorTitle} className="py-2">
                <WorkflowTranslationStatus workflowId={workflow.workflowId} className="h-7 text-xs" />
              </PanelHeader>
              <div className="flex-1 overflow-y-auto">
                <div className="h-full p-3">
                  {currentEnvironment?.type === EnvironmentTypeEnum.DEV ? (
                    <StepEditorFactory />
                  ) : (
                    <div className="flex h-full items-center justify-center p-6">
                      <div className="max-w-md space-y-4 text-center">
                        <div className="flex justify-center">
                          <div className="bg-neutral-alpha-50 rounded-full p-3">
                            <RiLockLine className="text-neutral-alpha-400 h-8 w-8" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-base font-medium text-neutral-600">Step editor unavailable</h3>
                          <p className="text-sm leading-relaxed text-neutral-500">
                            Step editing is only available in development environments. Switch to a development
                            environment to modify this step.
                          </p>
                        </div>
                        {developmentEnvironment && (
                          <div className="flex justify-center pt-2">
                            <Button
                              variant="secondary"
                              size="xs"
                              mode="gradient"
                              onClick={handleSwitchToDevelopment}
                              trailingIcon={RiArrowRightSLine}
                            >
                              Switch to {developmentEnvironment.name}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ResizableLayout.EditorPanel>

            <ResizableLayout.Handle />

            <ResizableLayout.PreviewPanel>
              <PanelHeader icon={RiEyeLine} title="Preview" isLoading={isSubsequentLoad} className="py-2">
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
