import {
  AiAgentTypeEnum,
  AiResourceTypeEnum,
  ContentIssueEnum,
  EnvironmentTypeEnum,
  FeatureFlagsKeysEnum,
  PermissionsEnum,
  ResourceOriginEnum,
  StepResponseDto,
  WorkflowResponseDto,
} from '@novu/shared';
import { useMemo, useState } from 'react';
import { RiCodeBlock, RiEdit2Line, RiEyeLine, RiGitCommitFill, RiPlayCircleLine } from 'react-icons/ri';
import { useParams } from 'react-router-dom';
import { AiChatProvider } from '@/components/ai-sidekick';
import { NovuCopilotPanel } from '@/components/ai-sidekick/novu-copilot-panel';
import { BroomSparkle } from '@/components/icons/broom-sparkle';
import { IssuesPanel } from '@/components/issues-panel';
import { Badge, BadgeIcon } from '@/components/primitives/badge';
import { Button } from '@/components/primitives/button';
import { FormRoot } from '@/components/primitives/form/form';
import { LocaleSelect } from '@/components/primitives/locale-select';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/primitives/tabs';
import { PreviewContextContainer } from '@/components/workflow-editor/steps/context/preview-context-container';
import { StepEditorProvider, useStepEditor } from '@/components/workflow-editor/steps/context/step-editor-context';
import { StepEditorFactory } from '@/components/workflow-editor/steps/editor/step-editor-factory';
import { HttpRequestTestProvider } from '@/components/workflow-editor/steps/http-request/http-request-test-provider';
import { PanelHeader } from '@/components/workflow-editor/steps/layout/panel-header';
import { ResizableLayout } from '@/components/workflow-editor/steps/layout/resizable-layout';
import { StepPreviewFactory } from '@/components/workflow-editor/steps/preview/step-preview-factory';
import { useSaveForm } from '@/components/workflow-editor/steps/save-form-context';
import { StepEditorModeToggle } from '@/components/workflow-editor/steps/shared/step-editor-mode-toggle';
import { useStepResolverHint } from '@/components/workflow-editor/steps/shared/use-step-resolver-hint';
import { parseJsonValue } from '@/components/workflow-editor/steps/utils/preview-context.utils';
import { getEditorTitle } from '@/components/workflow-editor/steps/utils/step-utils';
import { TestWorkflowDrawer } from '@/components/workflow-editor/test-workflow/test-workflow-drawer';
import { TranslationStatus } from '@/components/workflow-editor/translation-status';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
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
  const { step, isSubsequentLoad, editorValue, workflow, selectedLocale, setSelectedLocale, controlValues } =
    useStepEditor();
  const stepResolverHint = useStepResolverHint();
  const { isPending: isWorkflowPending, refetch: refetchWorkflow } = useWorkflow();
  const { currentEnvironment } = useEnvironment();
  const { onBlur } = useSaveForm();
  const isAiEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_AI_WORKFLOW_GENERATION_ENABLED);
  const isDevEnvironment = currentEnvironment?.type === EnvironmentTypeEnum.DEV;
  const isExternalWorkflow = !workflow || workflow.origin === ResourceOriginEnum.EXTERNAL;
  const showCopilot = isAiEnabled && isDevEnvironment && !isExternalWorkflow;

  const editorTitle = getEditorTitle(step.type);
  const { workflowSlug = '' } = useParams<{ workflowSlug: string }>();
  const [isTestDrawerOpen, setIsTestDrawerOpen] = useState(false);
  const { testData } = useFetchWorkflowTestData({ workflowSlug });
  const isTranslationsEnabled =
    useIsTranslationEnabled({
      isTranslationEnabledOnResource: workflow?.isTranslationEnabled ?? false,
    }) && !step.stepResolverHash;

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

  const filteredIssues = useMemo(() => {
    if (!step.issues?.controls) return step.issues;

    const flatValues = (controlValues ?? {}) as Record<string, unknown>;
    const nestedValues = (flatValues.controlValues ?? {}) as Record<string, unknown>;

    const filteredControls = Object.fromEntries(
      Object.entries(step.issues.controls).filter(([key, issues]) => {
        const val = flatValues[key] ?? nestedValues[key];
        const hasValue = val !== undefined && val !== null && val !== '';

        if (!hasValue) return true;

        return !issues.every((issue) => issue.issueType === ContentIssueEnum.MISSING_VALUE);
      })
    );

    return {
      ...step.issues,
      controls: Object.keys(filteredControls).length > 0 ? filteredControls : undefined,
    };
  }, [step.issues, controlValues]);

  const aiChatConfig = useMemo(
    () => ({
      resourceType: AiResourceTypeEnum.WORKFLOW,
      resourceId: workflow?._id,
      agentType: AiAgentTypeEnum.GENERATE_WORKFLOW,
      metadata: { stepId: step.stepId },
      isResourceLoading: isWorkflowPending,
      onRefetchResource: () => {
        refetchWorkflow({ cancelRefetch: true });
      },
      onKeepSuccess: () => showSuccessToast('Changes are successfully applied'),
      onKeepError: () => showErrorToast('Failed to apply changes'),
      onData: (data: { type: string }) => {
        if (
          data.type === 'data-step-added' ||
          data.type === 'data-workflow-completed' ||
          data.type === 'data-step-updated' ||
          data.type === 'data-step-removed' ||
          data.type === 'data-step-moved' ||
          data.type === 'data-workflow-metadata-updated'
        ) {
          refetchWorkflow({ cancelRefetch: true });
        }
      },
    }),
    [workflow?._id, step.stepId, isWorkflowPending, refetchWorkflow]
  );

  const currentPayload = parseJsonValue(editorValue).payload;

  const contextPanelContent = showCopilot ? (
    <Tabs defaultValue="preview" className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-neutral-200 pr-3">
        <TabsList variant="regular" className="border-b-0 border-t-0 px-3 py-2">
          <TabsTrigger value="copilot" size="xs" variant="regular">
            <span className="flex items-center gap-1">
              <BroomSparkle className="size-3" isAnimating />
              <span className="text-label-sm">Novu Copilot</span>
              <Badge variant="lighter" color="gray" className="ml-1">
                BETA
              </Badge>
            </span>
          </TabsTrigger>
          <TabsTrigger value="preview" size="xs" variant="regular">
            <span className="flex items-center gap-1">
              <RiCodeBlock className="size-3" />
              <span className="text-label-sm">Preview sandbox</span>
            </span>
          </TabsTrigger>
        </TabsList>
        <Protect permission={PermissionsEnum.EVENT_WRITE}>
          <Button
            variant="secondary"
            size="2xs"
            mode="outline"
            className="p-1.5"
            leadingIcon={RiPlayCircleLine}
            onClick={handleTestWorkflowClick}
            aria-label="Test workflow"
          />
        </Protect>
      </div>
      <TabsContent value="preview" className={`flex min-h-0 flex-1 flex-col data-[state="inactive"]:hidden`} forceMount>
        <div className="bg-bg-weak flex-1 overflow-hidden ">
          <div className="h-full overflow-y-auto">
            <PreviewContextContainer />
          </div>
        </div>
      </TabsContent>
      <TabsContent value="copilot" className={`flex min-h-0 flex-1 flex-col data-[state="inactive"]:hidden`} forceMount>
        <AiChatProvider config={aiChatConfig}>
          <NovuCopilotPanel hideHeader />
        </AiChatProvider>
      </TabsContent>
    </Tabs>
  ) : (
    <>
      <PanelHeader icon={RiCodeBlock} title="Preview sandbox" className="py-2">
        <Protect permission={PermissionsEnum.EVENT_WRITE}>
          <Button
            variant="secondary"
            size="2xs"
            mode="outline"
            className="p-1.5"
            leadingIcon={RiPlayCircleLine}
            onClick={handleTestWorkflowClick}
            aria-label="Test workflow"
          />
        </Protect>
      </PanelHeader>
      <div className="bg-bg-weak flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <PreviewContextContainer />
        </div>
      </div>
    </>
  );

  return (
    <ResizableLayout autoSaveId="step-editor-main-layout">
      <ResizableLayout.ContextPanel defaultSize={27} minSize={27} maxSize={80}>
        {contextPanelContent}
      </ResizableLayout.ContextPanel>

      <ResizableLayout.Handle />

      <ResizableLayout.MainContentPanel>
        {/* The form root is set on this level to avoid the issues with Copilot panel and form, because forms cannot be nested inside each other */}
        <FormRoot className="flex min-h-0 flex-1 flex-col" onBlur={onBlur} onSubmit={(e) => e.preventDefault()}>
          <ResizableLayout autoSaveId="step-editor-content-layout">
            <ResizableLayout.EditorPanel>
              <PanelHeader icon={() => <RiEdit2Line />} title={editorTitle} className="min-h-[45px] py-2">
                <div className="flex items-center gap-2">
                  <TranslationStatus
                    resourceId={workflow.workflowId}
                    resourceType={LocalizationResourceEnum.WORKFLOW}
                    isTranslationEnabled={isTranslationsEnabled}
                    className="h-7 text-xs"
                  />
                  {step.stepResolverHash && (
                    <Badge variant="lighter" color="gray" size="md" className="font-mono tracking-wide">
                      <BadgeIcon as={RiGitCommitFill} className="rotate-90" />
                      {step.stepResolverHash}
                    </Badge>
                  )}
                  {!isExternalWorkflow && <StepEditorModeToggle />}
                </div>
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
        </FormRoot>

        <IssuesPanel
          issues={filteredIssues}
          isTranslationEnabled={workflow.isTranslationEnabled}
          hintMessage={stepResolverHint}
        />
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
        <HttpRequestTestProvider>
          <StepEditorContent />
        </HttpRequestTestProvider>
      </StepEditorProvider>
    </div>
  );
}
