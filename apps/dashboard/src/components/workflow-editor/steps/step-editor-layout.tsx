import {
  AiAgentTypeEnum,
  AiResourceTypeEnum,
  AiWorkflowSuggestion,
  ContentIssueEnum,
  EnvironmentTypeEnum,
  FeatureFlagsKeysEnum,
  PermissionsEnum,
  ResourceOriginEnum,
  StepResponseDto,
  StepTypeEnum,
  WorkflowResponseDto,
} from '@novu/shared';
import { FC, SVGProps, useMemo, useState } from 'react';
import { IconType } from 'react-icons';
import {
  RiCodeBlock,
  RiEdit2Line,
  RiEyeLine,
  RiGitCommitFill,
  RiLinkUnlinkM,
  RiListCheck3,
  RiPlayCircleLine,
  RiQuillPenLine,
} from 'react-icons/ri';
import { useNavigate, useParams } from 'react-router-dom';
import { AiChatProvider } from '@/components/ai-sidekick';
import { NovuCopilotPanel } from '@/components/ai-sidekick/novu-copilot-panel';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { Code2 } from '@/components/icons/code-2';
import { IssuesPanel } from '@/components/issues-panel';
import { Badge, BadgeIcon } from '@/components/primitives/badge';
import { Button } from '@/components/primitives/button';
import { FormRoot } from '@/components/primitives/form/form';
import { LocaleSelect } from '@/components/primitives/locale-select';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { PreviewContextContainer } from '@/components/workflow-editor/steps/context/preview-context-container';
import { StepEditorProvider, useStepEditor } from '@/components/workflow-editor/steps/context/step-editor-context';
import { StepEditorFactory } from '@/components/workflow-editor/steps/editor/step-editor-factory';
import { HttpRequestTestProvider } from '@/components/workflow-editor/steps/http-request/http-request-test-provider';
import { CopilotSidebar } from '@/components/workflow-editor/steps/layout/copilot-sidebar';
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
import { useDisconnectStepResolver } from '@/hooks/use-disconnect-step-resolver';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useFetchTranslationGroup } from '@/hooks/use-fetch-translation-group';
import { useFetchWorkflowTestData } from '@/hooks/use-fetch-workflow-test-data';
import { useIsTranslationEnabled } from '@/hooks/use-is-translation-enabled';
import { LocalizationResourceEnum } from '@/types/translations';
import { INLINE_CONFIGURABLE_STEP_TYPES, STEP_RESOLVER_SUPPORTED_STEP_TYPES } from '@/utils/constants';
import { cn } from '@/utils/ui';
import { Protect } from '../../../utils/protect';

type StepEditorLayoutProps = {
  workflow: WorkflowResponseDto;
  step: StepResponseDto;
  className?: string;
};

function DisconnectResolverButton({ step }: { step: StepResponseDto }) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const { disconnectStepResolver, isPending } = useDisconnectStepResolver();
  const { currentEnvironment } = useEnvironment();
  const navigate = useNavigate();

  if (currentEnvironment?.type !== EnvironmentTypeEnum.DEV) {
    return null;
  }

  const handleDisconnect = async () => {
    try {
      await disconnectStepResolver({ stepInternalId: step._id, stepType: step.type });
      navigate('..', { relative: 'path' });
    } catch {
      // error handled silently; toast handled by mutation
    } finally {
      setIsConfirmOpen(false);
    }
  };

  return (
    <>
      <ConfirmationModal
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        onConfirm={handleDisconnect}
        title="Switch back to native controls?"
        description="This will disconnect your custom code step and restore the native controls configured in the sidebar."
        confirmButtonText="Disconnect"
        isLoading={isPending}
      />
      <Button
        variant="secondary"
        mode="outline"
        size="2xs"
        type="button"
        leadingIcon={RiLinkUnlinkM}
        onClick={() => setIsConfirmOpen(true)}
      >
        Disconnect custom code
      </Button>
    </>
  );
}

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
  const isInlineResolverStep =
    INLINE_CONFIGURABLE_STEP_TYPES.includes(step.type) && STEP_RESOLVER_SUPPORTED_STEP_TYPES.includes(step.type);
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

  const newChatSuggestions = useMemo(() => {
    const suggestions: { label: AiWorkflowSuggestion; icon: IconType | FC<SVGProps<SVGSVGElement>> }[] = [
      { label: AiWorkflowSuggestion.AUTOCOMPLETE, icon: RiListCheck3 },
      { label: AiWorkflowSuggestion.APPLY_CONDITIONS, icon: Code2 },
    ];

    const isContentStep = [
      StepTypeEnum.EMAIL,
      StepTypeEnum.SMS,
      StepTypeEnum.PUSH,
      StepTypeEnum.IN_APP,
      StepTypeEnum.CHAT,
    ].includes(step.type);
    const emptyBody = !step.controlValues?.body;
    if (isContentStep && !emptyBody) {
      suggestions.push({ label: AiWorkflowSuggestion.IMPROVE_MESSAGING, icon: RiQuillPenLine });
    } else if (isContentStep && emptyBody) {
      suggestions.push({ label: AiWorkflowSuggestion.GENERATE_STEP_CONTENT, icon: RiQuillPenLine });
    }

    if (Object.keys(step.issues?.controls ?? {}).length > 0) {
      suggestions.push({ label: AiWorkflowSuggestion.FIX_STEP_ISSUES, icon: RiListCheck3 });
    }

    return suggestions;
  }, [step]);

  const aiChatConfig = useMemo(
    () => ({
      resourceType: AiResourceTypeEnum.WORKFLOW,
      resourceId: workflow?._id,
      newChatSuggestions,
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
          data.type === 'data-workflow-metadata-updated' ||
          data.type === 'data-payload-schema-updated'
        ) {
          refetchWorkflow({ cancelRefetch: true });
        }
      },
    }),
    [workflow?._id, step.stepId, newChatSuggestions, isWorkflowPending, refetchWorkflow]
  );

  const currentPayload = parseJsonValue(editorValue).payload;

  const testWorkflowButton = (
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
  );

  const previewContent = (
    <div className="bg-bg-weak flex-1 overflow-hidden">
      <div className="h-full overflow-y-auto">
        <PreviewContextContainer />
      </div>
    </div>
  );

  const mainContent = (
    <>
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
                {isInlineResolverStep
                  ? step.stepResolverHash && <DisconnectResolverButton step={step} />
                  : !isExternalWorkflow && <StepEditorModeToggle />}
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
    </>
  );

  if (showCopilot) {
    return (
      <>
        <CopilotSidebar
          copilotContent={
            <AiChatProvider config={aiChatConfig}>
              <NovuCopilotPanel hideHeader />
            </AiChatProvider>
          }
          previewContent={previewContent}
          testWorkflowButton={testWorkflowButton}
          autoSaveId="step-editor-copilot-layout"
          hideCollapseButton
          maxSize="40%"
        >
          <div className="flex h-full min-w-0 flex-1 flex-col">{mainContent}</div>
        </CopilotSidebar>
        <TestWorkflowDrawer
          isOpen={isTestDrawerOpen}
          onOpenChange={setIsTestDrawerOpen}
          testData={testData}
          initialPayload={currentPayload}
        />
      </>
    );
  }

  return (
    <ResizableLayout autoSaveId="step-editor-main-layout">
      <ResizableLayout.ContextPanel defaultSize="27%" minSize="27%" maxSize="80%">
        <PanelHeader icon={RiCodeBlock} title="Preview sandbox" className="py-2">
          {testWorkflowButton}
        </PanelHeader>
        {previewContent}
      </ResizableLayout.ContextPanel>

      <ResizableLayout.Handle />

      <ResizableLayout.MainContentPanel>{mainContent}</ResizableLayout.MainContentPanel>

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
