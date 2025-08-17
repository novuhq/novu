import { PermissionsEnum } from '@novu/shared';
import { useCallback, useState } from 'react';
import { RiArrowDownSLine, RiCodeSSlashLine, RiFileCopyLine, RiPlayCircleLine } from 'react-icons/ri';
import { Link, useMatch, useNavigate } from 'react-router-dom';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';

import { useAuth } from '@/context/auth/hooks';
import { useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useFetchApiKeys } from '@/hooks/use-fetch-api-keys';
import { useHasPermission } from '@/hooks/use-has-permission';
import { useTriggerWorkflow } from '@/hooks/use-trigger-workflow';
import { useWorkflowPayloadPersistence } from '@/hooks/use-workflow-payload-persistence';
import { generatePostmanCollection, generateTriggerCurlCommand } from '@/utils/code-snippets';
import { Protect } from '@/utils/protect';
import { buildRoute, ROUTES } from '@/utils/routes';
import { Button } from '../primitives/button';
import { ButtonGroupItem, ButtonGroupRoot } from '../primitives/button-group';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../primitives/dropdown-menu';
import { ToastClose, ToastIcon } from '../primitives/sonner';
import { showErrorToast, showToast } from '../primitives/sonner-helpers';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../primitives/tabs';
import { TestWorkflowInstructions } from './test-workflow/test-workflow-instructions';
import { WorkflowActivity } from './workflow-activity';
import { WorkflowCanvas } from './workflow-canvas';

export const WorkflowTabs = () => {
  const { workflow } = useWorkflow();
  const { currentEnvironment } = useEnvironment();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const activityMatch = useMatch(ROUTES.EDIT_WORKFLOW_ACTIVITY);
  const [isIntegrateDrawerOpen, setIsIntegrateDrawerOpen] = useState(false);

  const { triggerWorkflow, isPending } = useTriggerWorkflow();
  const { getInitialPayload } = useWorkflowPayloadPersistence({
    workflowId: workflow?.workflowId || '',
    environmentId: currentEnvironment?._id || '',
  });

  // API key management
  const has = useHasPermission();
  const canReadApiKeys = has({ permission: PermissionsEnum.API_KEY_READ });
  const { data: apiKeysResponse } = useFetchApiKeys({ enabled: canReadApiKeys });
  const apiKey = canReadApiKeys ? (apiKeysResponse?.data?.[0]?.key ?? 'your-api-key-here') : 'your-api-key-here';

  const handleIntegrateWorkflowClick = () => {
    setIsIntegrateDrawerOpen(true);
  };

  const handleCopyPostmanCollection = useCallback(async () => {
    if (!workflow?.workflowId || !currentUser) {
      showErrorToast('Workflow information or user is missing');
      return;
    }

    try {
      const payload = getInitialPayload(workflow);
      const subscriberData = {
        subscriberId: currentUser._id,
        firstName: currentUser.firstName ?? undefined,
        lastName: currentUser.lastName ?? undefined,
        email: currentUser.email ?? undefined,
      };

      const postmanCollection = generatePostmanCollection({
        workflowId: workflow.workflowId,
        to: subscriberData,
        payload,
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
  }, [workflow, currentUser, apiKey, getInitialPayload]);

  const handleCopyCurl = useCallback(async () => {
    if (!workflow?.workflowId || !currentUser) {
      showErrorToast('Workflow information or user is missing');
      return;
    }

    try {
      const payload = getInitialPayload(workflow);
      const subscriberData = {
        subscriberId: currentUser._id,
        firstName: currentUser.firstName ?? undefined,
        lastName: currentUser.lastName ?? undefined,
        email: currentUser.email ?? undefined,
      };

      const curlCommand = generateTriggerCurlCommand({
        workflowId: workflow.workflowId,
        to: subscriberData,
        payload: JSON.stringify(payload),
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
  }, [workflow, currentUser, apiKey, getInitialPayload]);

  const handleFireAndForget = useCallback(async () => {
    if (!workflow || !currentUser) {
      showErrorToast('Workflow or user information is missing');
      return;
    }

    try {
      const payload = getInitialPayload(workflow);
      const subscriberData = {
        subscriberId: currentUser._id,
        firstName: currentUser.firstName ?? undefined,
        lastName: currentUser.lastName ?? undefined,
        email: currentUser.email ?? undefined,
      };

      const {
        data: { transactionId },
      } = await triggerWorkflow({
        name: workflow.workflowId ?? '',
        to: subscriberData,
        payload: payload,
      });

      if (!transactionId) {
        return showToast({
          variant: 'lg',
          children: ({ close }) => (
            <>
              <ToastIcon variant="error" />
              <div className="flex flex-col gap-2">
                <span className="font-medium">Test workflow failed</span>
                <span className="text-foreground-600 inline">
                  Workflow <span className="font-bold">{workflow?.name}</span> cannot be triggered. Ensure that it is
                  active and requires no further actions.
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
                    const activityUrl =
                      buildRoute(ROUTES.EDIT_WORKFLOW_ACTIVITY, {
                        environmentSlug: currentEnvironment?.slug ?? '',
                        workflowSlug: workflow?.slug ?? '',
                      }) + `?transactionId=${transactionId}`;
                    navigate(activityUrl);
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
    } catch (e) {
      showErrorToast(
        e instanceof Error ? e.message : 'There was an error triggering the workflow.',
        'Failed to trigger workflow'
      );
    }
  }, [workflow, currentUser, triggerWorkflow, getInitialPayload, navigate, currentEnvironment]);

  // Determine current tab based on URL
  const currentTab = activityMatch ? 'activity' : 'workflow';

  return (
    <div className="flex h-full flex-1 flex-nowrap">
      <Tabs defaultValue="workflow" className="-mt-px flex h-full flex-1 flex-col" value={currentTab}>
        <TabsList variant="regular" className="items-center">
          <TabsTrigger value="workflow" asChild variant="regular" size="lg">
            <Link
              to={buildRoute(ROUTES.EDIT_WORKFLOW, {
                environmentSlug: currentEnvironment?.slug ?? '',
                workflowSlug: workflow?.slug ?? '',
              })}
            >
              Workflow
            </Link>
          </TabsTrigger>
          <TabsTrigger value="activity" asChild variant="regular" size="lg">
            <Link
              to={buildRoute(ROUTES.EDIT_WORKFLOW_ACTIVITY, {
                environmentSlug: currentEnvironment?.slug ?? '',
                workflowSlug: workflow?.slug ?? '',
              })}
            >
              Activity
            </Link>
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
                    onClick={() => {
                      navigate(
                        buildRoute(ROUTES.TRIGGER_WORKFLOW, {
                          environmentSlug: currentEnvironment?.slug ?? '',
                          workflowSlug: workflow?.slug ?? '',
                        })
                      );
                    }}
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
                        className="rounded-l-none rounded-r-lg border-none text-white"
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
        <TabsContent value="workflow" className="mt-0 h-full w-full">
          <WorkflowCanvas steps={workflow?.steps || []} />
        </TabsContent>
        <TabsContent value="activity" className="mt-0 h-full w-full">
          <WorkflowActivity />
        </TabsContent>
      </Tabs>

      <TestWorkflowInstructions
        isOpen={isIntegrateDrawerOpen}
        onClose={() => setIsIntegrateDrawerOpen(false)}
        workflow={workflow}
        to={{}}
        payload="{}"
      />
    </div>
  );
};
