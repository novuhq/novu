import {
  AiAgentTypeEnum,
  AiResourceTypeEnum,
  AiWorkflowSuggestion,
  EnvironmentTypeEnum,
  FeatureFlagsKeysEnum,
  PermissionsEnum,
  ResourceOriginEnum,
  StepTypeEnum,
} from '@novu/shared';
import { FC, SVGProps, useCallback, useMemo, useState } from 'react';
import { IconType } from 'react-icons/lib';
import {
  RiArrowDownSLine,
  RiCodeSSlashLine,
  RiFileCopyLine,
  RiListCheck3,
  RiPlayCircleLine,
  RiQuillPenLine,
} from 'react-icons/ri';
import { Link, useMatch, useNavigate, useParams } from 'react-router-dom';
import { useWorkflowEditorRoutes } from '@/components/workflow-editor/use-workflow-editor-routes';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { IS_AI_FEATURES_ENABLED } from '@/config';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment } from '@/context/environment/hooks';
import { useDeleteWorkflow } from '@/hooks/use-delete-workflow';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useFetchApiKeys } from '@/hooks/use-fetch-api-keys';
import { useFetchWorkflowTestData } from '@/hooks/use-fetch-workflow-test-data';
import { useHasPermission } from '@/hooks/use-has-permission';
import { useIsPayloadSchemaEnabled } from '@/hooks/use-is-payload-schema-enabled';
import { useTriggerWorkflow } from '@/hooks/use-trigger-workflow';
import { generatePostmanCollection, generateTriggerCurlCommand } from '@/utils/code-snippets';
import { Protect } from '@/utils/protect';
import { buildRoute, ROUTES } from '@/utils/routes';
import { AiChatProvider, NovuCopilotPanel, useAiChat } from '../ai-sidekick';
import { SidekickToast } from '../ai-sidekick/sidekick-toast';
import { useWorkflowEditorCopilot } from '../copilot-web-chat';
import { DeleteWorkflowDialog } from '../delete-workflow-dialog';
import { Code2 } from '../icons/code-2';
import { Button } from '../primitives/button';
import { ButtonGroupItem, ButtonGroupRoot } from '../primitives/button-group';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../primitives/dropdown-menu';
import { ToastClose, ToastIcon } from '../primitives/sonner';
import { showErrorToast, showSuccessToast, showToast } from '../primitives/sonner-helpers';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../primitives/tabs';
import { CopilotSidebar } from './steps/layout/copilot-sidebar';
import { getInitialPayload, getInitialSubscriber } from './steps/utils/preview-context-storage.utils';
import { TestWorkflowDrawer } from './test-workflow/test-workflow-drawer';
import { TestWorkflowInstructions } from './test-workflow/test-workflow-instructions';
import { WorkflowActivity } from './workflow-activity';
import { WorkflowCanvas } from './workflow-canvas';

const WORKFLOW_MUTATION_DATA_EVENTS = new Set([
  'data-step-added',
  'data-workflow-completed',
  'data-step-updated',
  'data-step-removed',
  'data-step-moved',
  'data-workflow-metadata-updated',
  'data-payload-schema-updated',
]);

function getNewChatSuggestions(workflow: ReturnType<typeof useWorkflow>['workflow']) {
  const suggestions: { label: AiWorkflowSuggestion; icon: IconType | FC<SVGProps<SVGSVGElement>> }[] = [
    { label: AiWorkflowSuggestion.AUTOCOMPLETE, icon: RiListCheck3 },
  ];

  const hasAnySteps = (workflow?.steps?.length ?? 0) > 0;
  if (hasAnySteps) {
    suggestions.push({ label: AiWorkflowSuggestion.APPLY_CONDITIONS, icon: Code2 });
  }

  const hasContentSteps = workflow?.steps.some((step) =>
    [
      StepTypeEnum.EMAIL,
      StepTypeEnum.SMS,
      StepTypeEnum.PUSH,
      StepTypeEnum.IN_APP,
      StepTypeEnum.CHAT,
      StepTypeEnum.TOOL,
    ].includes(step.type)
  );
  if (hasContentSteps) {
    suggestions.push({ label: AiWorkflowSuggestion.IMPROVE_MESSAGING, icon: RiQuillPenLine });
  }

  if (workflow?.steps.some((step) => Object.keys(step.issues?.controls ?? {}).length > 0)) {
    suggestions.push({ label: AiWorkflowSuggestion.FIX_WORKFLOW_ISSUES, icon: RiListCheck3 });
  }

  return suggestions;
}

function showTriggerFailedToast(workflowName: string | undefined) {
  showToast({
    variant: 'lg',
    children: ({ close }) => (
      <>
        <ToastIcon variant="error" />
        <div className="flex flex-col gap-2">
          <span className="font-medium">Test workflow failed</span>
          <span className="text-foreground-600 inline">
            Workflow <span className="font-bold">{workflowName}</span> cannot be triggered. Ensure that it is active and
            requires no further actions.
          </span>
        </div>
        <ToastClose onClick={close} />
      </>
    ),
    options: {
      position: 'bottom-right',
    },
  });
}

function showTriggerSuccessToast(transactionId: string, onViewActivity: () => void) {
  showToast({
    children: ({ close }) => (
      <>
        <ToastIcon variant="success" />
        <div className="flex flex-1 flex-col items-start gap-3">
          <div className="flex flex-col items-start justify-center gap-1.5 self-stretch">
            <div className="text-foreground-950 text-sm font-medium">Workflow triggered successfully</div>
            <div className="flex items-center gap-2 self-stretch">
              <div className="flex-1 min-w-0">
                <div className="text-foreground-600 text-xs">Transaction ID</div>
                <div className="text-foreground-600 text-sm truncate" title={transactionId}>
                  {transactionId}
                </div>
              </div>
              <Button
                variant="secondary"
                mode="ghost"
                size="xs"
                className="shrink-0 p-1.5 h-7 w-7"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(transactionId);
                    showToast({
                      children: () => (
                        <>
                          <ToastIcon variant="success" />
                          <span className="text-sm">Transaction ID copied!</span>
                        </>
                      ),
                      options: {
                        position: 'bottom-right',
                        duration: 2000,
                      },
                    });
                  } catch (error) {
                    console.error('Failed to copy transaction ID:', error);
                  }
                }}
                title="Copy transaction ID"
              >
                <RiFileCopyLine className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 self-stretch">
            <Button
              variant="secondary"
              mode="ghost"
              size="xs"
              onClick={() => {
                onViewActivity();
                close();
              }}
            >
              View in Activity
            </Button>
          </div>
        </div>
        <ToastClose className="absolute right-3 top-3" onClick={close} />
      </>
    ),
    options: {
      position: 'bottom-right',
      duration: 6000,
      style: {
        minWidth: '280px',
      },
    },
  });
}

function buildSubscriberData(
  workflowId: string | undefined,
  environmentId: string | undefined,
  user: { _id?: string; firstName?: string | null; lastName?: string | null; email?: string | null }
) {
  if (!workflowId || !environmentId) {
    return { subscriberId: 'subscriber-id' };
  }

  const userFields = user._id
    ? {
        _id: user._id,
        firstName: user.firstName ?? undefined,
        lastName: user.lastName ?? undefined,
        email: user.email ?? undefined,
      }
    : undefined;

  const initialSubscriber = getInitialSubscriber(workflowId, environmentId, userFields);

  const data: Record<string, string> = {
    subscriberId: initialSubscriber?.subscriberId ?? 'subscriber-id',
  };

  if (initialSubscriber?.firstName) {
    data.firstName = initialSubscriber.firstName;
  }
  if (initialSubscriber?.lastName) {
    data.lastName = initialSubscriber.lastName;
  }
  if (initialSubscriber?.email) {
    data.email = initialSubscriber.email;
  }

  return data;
}

function buildTabPath(
  route: string,
  environmentSlug: string | undefined,
  workflowSlug: string | undefined,
  omitWorkflowSlug = false
) {
  if (environmentSlug === undefined || workflowSlug === undefined) {
    return undefined;
  }

  return buildRoute(route, { environmentSlug, ...(omitWorkflowSlug ? {} : { workflowSlug }) });
}

function WorkflowCanvasPane({
  showCopilot,
  isReadOnly,
  steps,
}: {
  showCopilot: boolean;
  isReadOnly: boolean;
  steps: NonNullable<ReturnType<typeof useWorkflow>['workflow']>['steps'] | undefined;
}) {
  if (showCopilot) {
    return (
      <WorkflowCopilotSidebar>
        <div className="relative h-full min-w-0 flex-1">
          <WorkflowCanvas isReadOnly={isReadOnly} steps={steps || []} />
          <WorkflowCanvasToast />
        </div>
      </WorkflowCopilotSidebar>
    );
  }

  return (
    <div className="relative flex-1">
      <WorkflowCanvas isReadOnly={isReadOnly} steps={steps || []} />
    </div>
  );
}

function renderTabLabel(label: string, to: string | undefined) {
  return to ? <Link to={to}>{label}</Link> : <span>{label}</span>;
}

export const WorkflowTabs = () => {
  const { workflow, isPending: isWorkflowPending, refetch: refetchWorkflow } = useWorkflow();
  const { currentEnvironment, areEnvironmentsInitialLoading } = useEnvironment();
  const { isLocalRoute, editWorkflowRoute, activityRoute } = useWorkflowEditorRoutes();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const isAiWorkflowGenerationEnabled =
    useFeatureFlag(FeatureFlagsKeysEnum.IS_AI_WORKFLOW_GENERATION_ENABLED) && IS_AI_FEATURES_ENABLED;
  const activityMatch = useMatch(ROUTES.EDIT_WORKFLOW_ACTIVITY);
  const [isIntegrateDrawerOpen, setIsIntegrateDrawerOpen] = useState(false);
  const [isTriggerDrawerOpen, setIsTriggerDrawerOpen] = useState(false);
  const { workflowSlug = '' } = useParams<{ workflowSlug?: string; stepSlug?: string }>();
  const { testData } = useFetchWorkflowTestData({ workflowSlug });
  const isNewWorkflowSlug = workflowSlug === 'new';

  const { triggerWorkflow, isPending } = useTriggerWorkflow();
  const isPayloadSchemaEnabled = useIsPayloadSchemaEnabled();

  const userId = currentUser?._id;
  const userFirstName = currentUser?.firstName;
  const userLastName = currentUser?.lastName;
  const userEmail = currentUser?.email;
  const isDevEnvironment = currentEnvironment?.type === EnvironmentTypeEnum.DEV;

  // API key management
  const has = useHasPermission();
  const canReadApiKeys = has({ permission: PermissionsEnum.API_KEY_READ });
  const { data: apiKeysResponse } = useFetchApiKeys({ enabled: canReadApiKeys });
  const apiKey = canReadApiKeys ? (apiKeysResponse?.data?.[0]?.key ?? 'your-api-key-here') : 'your-api-key-here';
  const isExternalWorkflow = !workflow || workflow.origin === ResourceOriginEnum.EXTERNAL;
  const isReadOnly =
    isNewWorkflowSlug ||
    isExternalWorkflow ||
    !has({ permission: PermissionsEnum.WORKFLOW_WRITE }) ||
    !isDevEnvironment;
  const showCopilot = useWorkflowEditorCopilot({
    isLegacyCopilotEnabled: isAiWorkflowGenerationEnabled,
    isAvailable: isDevEnvironment && !isExternalWorkflow,
    workflowId: workflow?._id,
    workflowLabel: workflow?.workflowId,
    onRefetch: () => refetchWorkflow({ cancelRefetch: true }),
  });

  // Memoize subscriber data and payload for integration instructions
  // Use the most recently tested subscriber for this workflow, fallback to current user
  const subscriberData = useMemo(
    () =>
      buildSubscriberData(workflow?.workflowId, currentEnvironment?._id, {
        _id: userId,
        firstName: userFirstName,
        lastName: userLastName,
        email: userEmail,
      }),
    [workflow?.workflowId, currentEnvironment?._id, userId, userFirstName, userLastName, userEmail]
  );

  const integrationPayload = useMemo(() => {
    if (!workflow?.workflowId || !currentEnvironment?._id) {
      return {};
    }
    return getInitialPayload(workflow.workflowId, currentEnvironment._id, workflow, isPayloadSchemaEnabled);
  }, [workflow, currentEnvironment?._id, isPayloadSchemaEnabled]);

  const handleIntegrateWorkflowClick = () => {
    setIsIntegrateDrawerOpen(true);
  };

  const handleCopyPostmanCollection = useCallback(async () => {
    if (!workflow?.workflowId || !currentUser || !currentEnvironment?._id) {
      showErrorToast('Workflow information or user is missing');
      return;
    }

    try {
      const postmanCollection = generatePostmanCollection({
        workflowId: workflow.workflowId,
        to: subscriberData,
        payload: integrationPayload,
        apiKey,
      });

      await navigator.clipboard.writeText(JSON.stringify(postmanCollection, null, 2));
      showToast({
        children: ({ close }) => (
          <>
            <ToastIcon variant="success" />
            <div className="flex flex-col gap-1">
              <span>Postman collection copied to clipboard</span>
              <span className="text-foreground-600 text-xs">Import it in Postman: File → Import → Raw text</span>
            </div>
            <ToastClose onClick={close} />
          </>
        ),
        options: {
          position: 'bottom-right',
          duration: 5000,
        },
      });
    } catch {
      showErrorToast('Failed to copy Postman collection', 'Postman Error');
    }
  }, [workflow, currentUser, currentEnvironment?._id, apiKey, subscriberData, integrationPayload]);

  const handleCopyCurl = useCallback(async () => {
    if (!workflow?.workflowId || !currentUser || !currentEnvironment?._id) {
      showErrorToast('Workflow information or user is missing');
      return;
    }

    try {
      const curlCommand = generateTriggerCurlCommand({
        workflowId: workflow.workflowId,
        to: subscriberData,
        payload: JSON.stringify(integrationPayload),
        apiKey: apiKey,
      });

      await navigator.clipboard.writeText(curlCommand);
      showToast({
        children: ({ close }) => (
          <>
            <ToastIcon variant="success" />
            <span>cURL command copied to clipboard</span>
            <ToastClose onClick={close} />
          </>
        ),
        options: {
          position: 'bottom-right',
        },
      });
    } catch {
      showErrorToast('Failed to copy cURL command', 'Copy Error');
    }
  }, [workflow, currentUser, currentEnvironment?._id, apiKey, subscriberData, integrationPayload]);

  const handleFireAndForget = useCallback(async () => {
    if (!workflow || !currentUser || !currentEnvironment?._id) {
      showErrorToast('Workflow or user information is missing');
      return;
    }

    try {
      const {
        data: { transactionId },
      } = await triggerWorkflow({
        name: workflow.workflowId ?? '',
        to: subscriberData,
        payload: integrationPayload,
      });

      if (!transactionId) {
        return showTriggerFailedToast(workflow?.name);
      }

      showTriggerSuccessToast(transactionId, () => {
        const activityUrl = `${buildRoute(activityRoute, {
          environmentSlug: currentEnvironment?.slug ?? '',
          ...(isLocalRoute ? {} : { workflowSlug: workflow?.slug ?? '' }),
        })}?transactionId=${transactionId}`;
        navigate(activityUrl);
      });
    } catch (e) {
      showErrorToast(
        e instanceof Error ? e.message : 'There was an error triggering the workflow.',
        'Failed to trigger workflow'
      );
    }
  }, [
    workflow,
    currentUser,
    currentEnvironment?._id,
    currentEnvironment?.slug,
    triggerWorkflow,
    navigate,
    subscriberData,
    integrationPayload,
  ]);

  // Determine current tab based on URL
  const currentTab = activityMatch ? 'activity' : 'workflow';

  const { deleteWorkflow, isPending: isDeletePending } = useDeleteWorkflow();

  const newChatSuggestions = useMemo(() => getNewChatSuggestions(workflow), [workflow]);

  const aiChatConfig = useMemo(
    () => ({
      resourceType: AiResourceTypeEnum.WORKFLOW,
      resourceId: workflow?._id,
      newChatSuggestions,
      agentType: AiAgentTypeEnum.GENERATE_WORKFLOW,
      metadata: { workflowId: workflow?._id },
      isResourceLoading: isWorkflowPending,
      onRefetchResource: () => refetchWorkflow({ cancelRefetch: true }),
      onData: (data: { type: string }) => {
        if (WORKFLOW_MUTATION_DATA_EVENTS.has(data.type)) {
          refetchWorkflow({ cancelRefetch: true });
        }
      },
      onKeepSuccess: () => showSuccessToast('Changes are successfully applied'),
      onKeepError: () => showErrorToast('Failed to apply changes'),
      firstMessageRevert: workflow
        ? {
            renderDialog: (props: {
              open: boolean;
              onOpenChange: (open: boolean) => void;
              onConfirm: () => Promise<void>;
            }) => (
              <DeleteWorkflowDialog
                workflow={workflow}
                open={props.open}
                onOpenChange={props.onOpenChange}
                onConfirm={props.onConfirm}
                isLoading={isDeletePending}
              />
            ),
            onConfirm: async () => {
              await deleteWorkflow({ workflowSlug: workflow.slug });
              navigate(buildRoute(ROUTES.WORKFLOWS, { environmentSlug: currentEnvironment?.slug ?? '' }));
            },
          }
        : undefined,
    }),
    [
      workflow,
      isWorkflowPending,
      newChatSuggestions,
      refetchWorkflow,
      deleteWorkflow,
      isDeletePending,
      navigate,
      currentEnvironment?.slug,
    ]
  );

  const environmentSlug = currentEnvironment?.slug;
  const workflowTabPath = buildTabPath(editWorkflowRoute, environmentSlug, workflow?.slug);
  const activityTabPath = buildTabPath(activityRoute, environmentSlug, workflow?.slug, isLocalRoute);

  const content = (
    <div className="flex h-full w-full flex-1 flex-nowrap">
      <Tabs defaultValue="workflow" className="-mt-px flex h-full max-w-full flex-1 flex-col" value={currentTab}>
        <TabsList variant="regular" className="items-center">
          <TabsTrigger
            value="workflow"
            asChild
            variant="regular"
            size="lg"
            disabled={isWorkflowPending || areEnvironmentsInitialLoading}
          >
            {renderTabLabel('Workflow', workflowTabPath)}
          </TabsTrigger>
          <TabsTrigger
            value="activity"
            asChild
            variant="regular"
            size="lg"
            disabled={isWorkflowPending || areEnvironmentsInitialLoading}
          >
            {renderTabLabel('Activity', activityTabPath)}
          </TabsTrigger>
          <div className="my-auto ml-auto flex items-center gap-2">
            <Protect permission={PermissionsEnum.EVENT_WRITE}>
              <Button
                variant="secondary"
                size="2xs"
                mode="ghost"
                leadingIcon={RiCodeSSlashLine}
                onClick={handleIntegrateWorkflowClick}
              >
                Integrate workflow
              </Button>
              <ButtonGroupRoot size="xs">
                <ButtonGroupItem asChild>
                  <Button
                    variant="secondary"
                    size="xs"
                    mode="gradient"
                    className="rounded-l-lg rounded-r-none border-none p-2 text-white text-xs"
                    onClick={() => setIsTriggerDrawerOpen(true)}
                  >
                    Test Workflow
                  </Button>
                </ButtonGroupItem>
                <ButtonGroupItem asChild>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="secondary"
                        size="xs"
                        mode="gradient"
                        className="rounded-l-none px-1.5 rounded-r-lg border-none text-white"
                        leadingIcon={RiArrowDownSLine}
                      />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleFireAndForget} className="cursor-pointer" disabled={isPending}>
                        <RiPlayCircleLine />
                        Quick Trigger
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleCopyCurl} className="cursor-pointer">
                        <RiFileCopyLine />
                        Copy cURL
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleCopyPostmanCollection} className="cursor-pointer">
                        <RiFileCopyLine />
                        Copy postman collection
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </ButtonGroupItem>
              </ButtonGroupRoot>
            </Protect>
          </div>
        </TabsList>
        <TabsContent value="workflow" className="flex mt-0 h-full max-w-full overflow-hidden">
          <WorkflowCanvasPane showCopilot={showCopilot} isReadOnly={isReadOnly} steps={workflow?.steps} />
        </TabsContent>
        <TabsContent value="activity" className="mt-0 h-full max-w-full">
          <WorkflowActivity />
        </TabsContent>
      </Tabs>

      <TestWorkflowInstructions
        isOpen={isIntegrateDrawerOpen}
        onClose={() => setIsIntegrateDrawerOpen(false)}
        workflow={workflow}
        to={subscriberData}
        payload={JSON.stringify(integrationPayload, null, 2)}
      />
      <TestWorkflowDrawer isOpen={isTriggerDrawerOpen} onOpenChange={setIsTriggerDrawerOpen} testData={testData} />
    </div>
  );

  return showCopilot ? <AiChatProvider config={aiChatConfig}>{content}</AiChatProvider> : content;
};

function WorkflowCopilotSidebar({ children }: { children: React.ReactNode }) {
  const { isGenerating } = useAiChat();

  return (
    <CopilotSidebar
      copilotContent={<NovuCopilotPanel hideHeader />}
      isGenerating={isGenerating}
      autoSaveId="workflow-editor-copilot-layout"
    >
      {children}
    </CopilotSidebar>
  );
}

function WorkflowCanvasToast() {
  const {
    isGenerating,
    isReviewingChanges,
    isActionPending,
    lastUserMessageId,
    handleStop,
    handleKeepAll,
    handleDiscard,
  } = useAiChat();

  const isVisible = isGenerating || isReviewingChanges;
  const variant = isGenerating ? 'generating' : 'reviewing';

  return (
    <SidekickToast
      isVisible={isVisible}
      variant={variant}
      isActionPending={isActionPending}
      onCancel={handleStop}
      onKeepAll={handleKeepAll}
      onDiscard={() => lastUserMessageId && handleDiscard(lastUserMessageId)}
    />
  );
}
