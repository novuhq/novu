import {
  ContextPayload,
  type ISubscriberResponseDto,
  PermissionsEnum,
  type WorkflowTestDataResponseDto,
} from '@novu/shared';
import { forwardRef, useCallback, useEffect, useState } from 'react';
import { RiArrowDownSLine, RiFileCopyLine } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { ButtonGroupItem, ButtonGroupRoot } from '@/components/primitives/button-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/primitives/sheet';
import { ToastClose, ToastIcon } from '@/components/primitives/sonner';
import { showErrorToast, showToast } from '@/components/primitives/sonner-helpers';
import { VisuallyHidden } from '@/components/primitives/visually-hidden';
import { SubscriberDrawer } from '@/components/subscribers/subscriber-drawer';
import { PayloadData, PreviewSubscriberData } from '@/components/workflow-editor/steps/types/preview-context.types';
import { TestWorkflowActivityDrawer } from '@/components/workflow-editor/test-workflow/test-workflow-activity-drawer';
import { TestWorkflowContent } from '@/components/workflow-editor/test-workflow/test-workflow-content';

import { useAuth } from '@/context/auth/hooks';
import { useFetchApiKeys } from '@/hooks/use-fetch-api-keys';
import { useFetchSubscriber } from '@/hooks/use-fetch-subscriber';
import { useHasPermission } from '@/hooks/use-has-permission';
import { useIsPayloadSchemaEnabled } from '@/hooks/use-is-payload-schema-enabled';
import { useTriggerWorkflow } from '@/hooks/use-trigger-workflow';
import { generatePostmanCollection, generateTriggerCurlCommand } from '@/utils/code-snippets';
import { useEnvironment } from '../../../context/environment/hooks';
import {
  cleanupExpiredPreviewData,
  clearContextData,
  clearSubscriberData,
  getInitialContext,
  getInitialPayload,
  getInitialSubscriber,
  saveContextData,
  savePayloadData,
  saveSubscriberData,
} from '../steps/utils/preview-context-storage.utils';
import { useWorkflow } from '../workflow-provider';

type TestWorkflowDrawerProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  testData?: WorkflowTestDataResponseDto;
  initialPayload?: PayloadData;
};

const getContextSpread = (contextData: Partial<ContextPayload> | null) => {
  return contextData && Object.keys(contextData).length > 0 ? { context: contextData } : {};
};

export const TestWorkflowDrawer = forwardRef<HTMLDivElement, TestWorkflowDrawerProps>((props, forwardedRef) => {
  const { isOpen, onOpenChange, initialPayload } = props;
  const [transactionId, setTransactionId] = useState<string>();
  const [isActivityDrawerOpen, setIsActivityDrawerOpen] = useState(false);
  const [isSubscriberDrawerOpen, setIsSubscriberDrawerOpen] = useState(false);
  const [payloadData, setPayloadData] = useState<PayloadData>({});
  const [subscriberData, setSubscriberData] = useState<PreviewSubscriberData | null>(null);
  const [contextData, setContextData] = useState<ContextPayload | null>(null);
  const [currentFormData, setCurrentFormData] = useState<{ to: unknown; payload: PayloadData } | null>(null);

  // Cleanup expired storage data on component mount
  useEffect(() => {
    cleanupExpiredPreviewData();
  }, []);

  const { currentEnvironment } = useEnvironment();
  const { workflow } = useWorkflow();
  const { currentUser } = useAuth();
  const { triggerWorkflow, isPending } = useTriggerWorkflow();
  const isPayloadSchemaEnabled = useIsPayloadSchemaEnabled();

  // API key management
  const has = useHasPermission();
  const canReadApiKeys = has({ permission: PermissionsEnum.API_KEY_READ });
  const { data: apiKeysResponse } = useFetchApiKeys({ enabled: canReadApiKeys });
  const apiKey = canReadApiKeys ? (apiKeysResponse?.data?.[0]?.key ?? 'your-api-key-here') : 'your-api-key-here';

  // Reset state when drawer closes to ensure fresh data on next open
  useEffect(() => {
    if (!isOpen) {
      setPayloadData({});
      setSubscriberData(null);
      setContextData(null);
    }
  }, [isOpen]);

  // Initialize data when drawer opens
  useEffect(() => {
    if (!isOpen || !workflow?.workflowId || !currentEnvironment?._id) return;

    const initialData =
      initialPayload && Object.keys(initialPayload).length > 0
        ? initialPayload
        : getInitialPayload(workflow.workflowId, currentEnvironment._id, workflow, isPayloadSchemaEnabled);
    setPayloadData(initialData);

    if (currentUser) {
      const initialSubscriber = getInitialSubscriber(workflow.workflowId, currentEnvironment._id, {
        _id: currentUser._id,
        firstName: currentUser.firstName ?? undefined,
        lastName: currentUser.lastName ?? undefined,
        email: currentUser.email ?? undefined,
      });
      if (initialSubscriber) {
        setSubscriberData(initialSubscriber);
      }
    }

    const initialContext = getInitialContext(workflow.workflowId, currentEnvironment._id);
    if (initialContext) {
      setContextData(initialContext);
    }
  }, [
    isOpen,
    workflow?.workflowId,
    currentEnvironment?._id,
    currentUser,
    initialPayload,
    isPayloadSchemaEnabled,
    workflow,
  ]);

  const subscriberIdToFetch = subscriberData?.subscriberId || '';
  const {
    data: fetchedSubscriberData,
    refetch: refetchSubscriber,
    isLoading: isLoadingSubscriber,
    error: subscriberFetchError,
  } = useFetchSubscriber({
    subscriberId: subscriberIdToFetch,
    options: {
      enabled: !!subscriberIdToFetch && !!currentEnvironment,
      retry: false,
      meta: { showError: false },
    },
  });

  useEffect(() => {
    if (fetchedSubscriberData && subscriberData?.subscriberId === fetchedSubscriberData.subscriberId) {
      setSubscriberData({
        subscriberId: fetchedSubscriberData.subscriberId,
        firstName: fetchedSubscriberData.firstName ?? undefined,
        lastName: fetchedSubscriberData.lastName ?? undefined,
        email: fetchedSubscriberData.email ?? undefined,
        phone: fetchedSubscriberData.phone ?? undefined,
        avatar: fetchedSubscriberData.avatar ?? undefined,
        locale: fetchedSubscriberData.locale ?? undefined,
        timezone: fetchedSubscriberData.timezone ?? undefined,
        data: fetchedSubscriberData.data ?? undefined,
      });
    } else if (
      subscriberFetchError &&
      subscriberData?.subscriberId &&
      subscriberData.subscriberId !== currentUser?._id &&
      currentUser &&
      workflow?.workflowId &&
      currentEnvironment?._id
    ) {
      clearSubscriberData(workflow.workflowId, currentEnvironment._id);

      setSubscriberData({
        subscriberId: currentUser._id,
        firstName: currentUser.firstName ?? undefined,
        lastName: currentUser.lastName ?? undefined,
        email: currentUser.email ?? undefined,
      });
    }
  }, [
    fetchedSubscriberData,
    subscriberFetchError,
    subscriberData?.subscriberId,
    currentUser,
    workflow?.workflowId,
    currentEnvironment?._id,
  ]);

  const handleSubscriberUpdate = useCallback(
    (subscriber: PreviewSubscriberData) => {
      setSubscriberData(subscriber);
      if (workflow?.workflowId && currentEnvironment?._id) {
        saveSubscriberData(workflow.workflowId, currentEnvironment._id, subscriber);
      }
    },
    [workflow?.workflowId, currentEnvironment?._id]
  );

  const handleSubscriberSelect = useCallback(
    (subscriber: ISubscriberResponseDto) => {
      const subscriberData: PreviewSubscriberData = {
        subscriberId: subscriber.subscriberId,
        firstName: subscriber.firstName ?? undefined,
        lastName: subscriber.lastName ?? undefined,
        email: subscriber.email ?? undefined,
        phone: subscriber.phone ?? undefined,
        avatar: subscriber.avatar ?? undefined,
        locale: subscriber.locale ?? undefined,
        timezone: subscriber.timezone ?? undefined,
        data: subscriber.data ?? undefined,
      };
      handleSubscriberUpdate(subscriberData);
    },
    [handleSubscriberUpdate]
  );

  const handleContextUpdate = useCallback(
    (context: ContextPayload) => {
      setContextData(context);
      if (workflow?.workflowId && currentEnvironment?._id) {
        saveContextData(workflow.workflowId, currentEnvironment._id, context);
      }
    },
    [workflow?.workflowId, currentEnvironment?._id]
  );

  const handlePayloadUpdate = useCallback(
    (updatedPayload: PayloadData) => {
      setPayloadData(updatedPayload);
      if (workflow?.workflowId && currentEnvironment?._id) {
        savePayloadData(workflow.workflowId, currentEnvironment._id, updatedPayload);
      }
    },
    [workflow?.workflowId, currentEnvironment?._id]
  );

  const handleSubscriberDrawerClose = useCallback(
    (open: boolean) => {
      setIsSubscriberDrawerOpen(open);

      if (!open && subscriberData?.subscriberId) {
        refetchSubscriber();
      }
    },
    [refetchSubscriber, subscriberData?.subscriberId]
  );

  const handleTriggerWorkflow = async () => {
    if (!subscriberData) {
      showErrorToast('Please select a subscriber first');
      return;
    }

    try {
      const {
        data: { transactionId: newTransactionId },
      } = await triggerWorkflow({
        name: workflow?.workflowId ?? '',
        to: subscriberData,
        payload: payloadData,
        ...getContextSpread(contextData),
      });

      if (!newTransactionId) {
        return showToast({
          variant: 'lg',
          children: ({ close }) => (
            <>
              <ToastIcon variant="error" />
              <div className="flex flex-col gap-2">
                <span className="font-medium">Test workflow failed</span>
                <span className="text-foreground-600 inline">
                  Workflow <span className="font-bold">{workflow?.name}</span> cannot be triggered. Ensure that it is
                  active and requires not further actions.
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

      setTransactionId(newTransactionId);
      setCurrentFormData({ to: subscriberData, payload: payloadData });
      setIsActivityDrawerOpen(true);
    } catch (e) {
      showErrorToast(
        e instanceof Error ? e.message : 'There was an error triggering the workflow.',
        'Failed to trigger workflow'
      );
    }
  };

  const handleCopyCurl = useCallback(async () => {
    if (!workflow?.workflowId || !subscriberData) {
      showErrorToast('Workflow information or subscriber is missing');
      return;
    }

    try {
      const curlCommand = generateTriggerCurlCommand({
        workflowId: workflow.workflowId,
        to: subscriberData,
        payload: payloadData,
        ...getContextSpread(contextData),
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
  }, [workflow?.workflowId, subscriberData, payloadData, contextData, apiKey]);

  const handleOpenInPostman = useCallback(async () => {
    if (!workflow?.workflowId || !subscriberData) {
      showErrorToast('Workflow information or subscriber is missing');
      return;
    }

    try {
      const postmanCollection = generatePostmanCollection({
        workflowId: workflow.workflowId,
        to: subscriberData,
        payload: payloadData,
        ...getContextSpread(contextData),
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
  }, [workflow?.workflowId, subscriberData, payloadData, contextData, apiKey]);

  const handleClearPersistedPayload = useCallback(() => {
    if (!workflow?.workflowId || !currentEnvironment?._id) return;

    const newPayload: PayloadData =
      isPayloadSchemaEnabled && workflow?.payloadExample ? (workflow.payloadExample as PayloadData) : {};
    setPayloadData(newPayload);
    savePayloadData(workflow.workflowId, currentEnvironment._id, newPayload);
  }, [workflow?.workflowId, workflow?.payloadExample, currentEnvironment?._id, isPayloadSchemaEnabled]);

  const handleClearPersistedSubscriber = useCallback(() => {
    if (!workflow?.workflowId || !currentEnvironment?._id) return;

    clearSubscriberData(workflow.workflowId, currentEnvironment._id);

    if (currentUser) {
      setSubscriberData({
        subscriberId: currentUser._id,
        firstName: currentUser.firstName ?? undefined,
        lastName: currentUser.lastName ?? undefined,
        email: currentUser.email ?? undefined,
      });
    }
  }, [workflow?.workflowId, currentEnvironment?._id, currentUser]);

  const handleClearPersistedContext = useCallback(() => {
    if (!workflow?.workflowId || !currentEnvironment?._id) return;

    clearContextData(workflow.workflowId, currentEnvironment._id);
    setContextData(null);
  }, [workflow?.workflowId, currentEnvironment?._id]);

  const handleEditSubscriber = useCallback(() => {
    setIsSubscriberDrawerOpen(true);
  }, []);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent ref={forwardedRef} className="w-[500px]">
        <VisuallyHidden>
          <SheetTitle>Test Workflow</SheetTitle>
          <SheetDescription>Configure and test your workflow</SheetDescription>
        </VisuallyHidden>

        <div className="flex h-full flex-col">
          <TestWorkflowContent
            workflow={workflow}
            payloadData={payloadData}
            subscriberData={subscriberData}
            contextData={contextData}
            isLoadingSubscriber={isLoadingSubscriber}
            onPayloadUpdate={handlePayloadUpdate}
            onSubscriberUpdate={handleSubscriberUpdate}
            onSubscriberSelect={handleSubscriberSelect}
            onContextUpdate={handleContextUpdate}
            onClearPersistedPayload={
              workflow?.workflowId && currentEnvironment?._id ? handleClearPersistedPayload : undefined
            }
            onClearPersistedSubscriber={
              workflow?.workflowId && currentEnvironment?._id ? handleClearPersistedSubscriber : undefined
            }
            onClearPersistedContext={
              workflow?.workflowId && currentEnvironment?._id ? handleClearPersistedContext : undefined
            }
            onEditSubscriber={handleEditSubscriber}
          />

          <div className="border-t border-neutral-200 bg-white">
            <div className="flex items-center justify-end px-3 py-1.5">
              <ButtonGroupRoot size="xs">
                <ButtonGroupItem asChild>
                  <Button
                    onClick={handleTriggerWorkflow}
                    mode="gradient"
                    className="rounded-l-lg rounded-r-none border-none p-2 text-white"
                    variant="secondary"
                    size="xs"
                    isLoading={isPending}
                  >
                    Test workflow
                  </Button>
                </ButtonGroupItem>
                <ButtonGroupItem asChild>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        mode="gradient"
                        className="rounded-l-none rounded-r-lg border-none text-white"
                        variant="secondary"
                        size="xs"
                        leadingIcon={RiArrowDownSLine}
                      ></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" withPortal={false}>
                      <DropdownMenuItem onClick={handleCopyCurl} className="cursor-pointer">
                        <RiFileCopyLine />
                        Copy cURL
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleOpenInPostman} className="cursor-pointer">
                        <RiFileCopyLine />
                        Copy Postman Collection
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </ButtonGroupItem>
              </ButtonGroupRoot>
            </div>
          </div>
        </div>
      </SheetContent>

      <TestWorkflowActivityDrawer
        isOpen={isActivityDrawerOpen}
        onOpenChange={setIsActivityDrawerOpen}
        transactionId={transactionId}
        workflow={workflow}
        to={currentFormData?.to as Record<string, string>}
        payload={currentFormData?.payload ? JSON.stringify(currentFormData.payload, null, 2) : undefined}
      />

      <SubscriberDrawer
        modal={true}
        open={isSubscriberDrawerOpen}
        onOpenChange={handleSubscriberDrawerClose}
        subscriberId={subscriberData?.subscriberId || ''}
        closeOnSave={true}
      />
    </Sheet>
  );
});

TestWorkflowDrawer.displayName = 'TestWorkflowDrawer';
