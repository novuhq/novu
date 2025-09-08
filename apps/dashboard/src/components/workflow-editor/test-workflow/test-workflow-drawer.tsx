import { zodResolver } from '@hookform/resolvers/zod';
import { type ISubscriberResponseDto, PermissionsEnum, type WorkflowTestDataResponseDto } from '@novu/shared';
import { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { RiArrowDownSLine, RiFileCopyLine } from 'react-icons/ri';
import * as z from 'zod';
import { Button } from '@/components/primitives/button';
import { ButtonGroupItem, ButtonGroupRoot } from '@/components/primitives/button-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import { Form, FormRoot } from '@/components/primitives/form/form';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/primitives/sheet';
import { ToastClose, ToastIcon } from '@/components/primitives/sonner';
import { showErrorToast, showToast } from '@/components/primitives/sonner-helpers';
import { VisuallyHidden } from '@/components/primitives/visually-hidden';
import { SubscriberDrawer } from '@/components/subscribers/subscriber-drawer';
import { PayloadData } from '@/components/workflow-editor/steps/types/preview-context.types';
import { TestWorkflowActivityDrawer } from '@/components/workflow-editor/test-workflow/test-workflow-activity-drawer';
import { TestWorkflowContent } from '@/components/workflow-editor/test-workflow/test-workflow-content';

import { useAuth } from '@/context/auth/hooks';
import { useFetchApiKeys } from '@/hooks/use-fetch-api-keys';
import { useFetchSubscriber } from '@/hooks/use-fetch-subscriber';
import { useHasPermission } from '@/hooks/use-has-permission';
import { useTestWorkflowSubscriberPersistence } from '@/hooks/use-test-workflow-subscriber-persistence';
import { useTriggerWorkflow } from '@/hooks/use-trigger-workflow';
import { useWorkflowPayloadPersistence } from '@/hooks/use-workflow-payload-persistence';
import { generatePostmanCollection, generateTriggerCurlCommand } from '@/utils/code-snippets';
import { useEnvironment } from '../../../context/environment/hooks';
import { cleanupExpiredPreviewData } from '../steps/utils/preview-context-storage.utils';
import { useWorkflow } from '../workflow-provider';

type TestWorkflowDrawerProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  testData?: WorkflowTestDataResponseDto;
  initialPayload?: PayloadData;
};

// Extract only the payload part from the original schema
const buildPayloadOnlyFormSchema = () => {
  return z.object({
    payload: z.string().transform((str, ctx) => {
      try {
        return JSON.parse(str);
      } catch {
        ctx.addIssue({ code: 'custom', message: 'Payload must be valid JSON' });
        return z.NEVER;
      }
    }),
  });
};

type TestWorkflowFormType = {
  payload: string; // JSON string that gets parsed
};

export const TestWorkflowDrawer = forwardRef<HTMLDivElement, TestWorkflowDrawerProps>((props, forwardedRef) => {
  const { isOpen, onOpenChange, initialPayload } = props;
  const [transactionId, setTransactionId] = useState<string>();
  const [isActivityDrawerOpen, setIsActivityDrawerOpen] = useState(false);
  const [isSubscriberDrawerOpen, setIsSubscriberDrawerOpen] = useState(false);
  const [subscriberData, setSubscriberData] = useState<Partial<ISubscriberResponseDto> | null>(null);
  const [currentFormData, setCurrentFormData] = useState<{ to: unknown; payload: string } | null>(null);

  // Cleanup expired storage data on component mount
  useEffect(() => {
    cleanupExpiredPreviewData();
  }, []);

  const { currentEnvironment } = useEnvironment();
  const { workflow } = useWorkflow();
  const { currentUser } = useAuth();
  const { triggerWorkflow, isPending } = useTriggerWorkflow();

  // API key management
  const has = useHasPermission();
  const canReadApiKeys = has({ permission: PermissionsEnum.API_KEY_READ });
  const { data: apiKeysResponse } = useFetchApiKeys({ enabled: canReadApiKeys });
  const apiKey = canReadApiKeys ? (apiKeysResponse?.data?.[0]?.key ?? 'your-api-key-here') : 'your-api-key-here';

  // Workflow-level payload persistence
  const { getInitialPayload, savePersistedPayload } = useWorkflowPayloadPersistence({
    workflowId: workflow?.workflowId || '',
    environmentId: currentEnvironment?._id || '',
  });

  // Test workflow subscriber persistence
  const { loadPersistedSubscriber, savePersistedSubscriber, clearPersistedSubscriber } =
    useTestWorkflowSubscriberPersistence({
      workflowId: workflow?.workflowId || '',
      environmentId: currentEnvironment?._id || '',
    });

  // Track if we've initialized the subscriber data
  const [hasInitializedSubscriber, setHasInitializedSubscriber] = useState(false);

  // Reset initialization flag when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setHasInitializedSubscriber(false);
    }
  }, [isOpen]);

  // Subscriber management - single source of truth
  const subscriberIdToFetch = subscriberData?.subscriberId || currentUser?._id || '';
  const {
    data: fetchedSubscriberData,
    refetch: refetchSubscriber,
    isLoading: isLoadingSubscriber,
    error: subscriberFetchError,
  } = useFetchSubscriber({
    subscriberId: subscriberIdToFetch,
    options: {
      enabled: !!subscriberIdToFetch && !!currentEnvironment,
      retry: false, // Don't retry if subscriber doesn't exist
    },
  });

  // Initialize subscriber data from persisted storage when drawer opens
  useEffect(() => {
    if (
      !hasInitializedSubscriber &&
      isOpen &&
      workflow?.workflowId &&
      currentEnvironment?._id &&
      currentUser &&
      !subscriberData?.subscriberId
    ) {
      const persistedSubscriber = loadPersistedSubscriber();

      if (persistedSubscriber) {
        // Try to use the persisted subscriber
        setSubscriberData(persistedSubscriber);
      } else {
        // No persisted subscriber, use current user
        const fallbackData = {
          subscriberId: currentUser._id,
          firstName: currentUser.firstName ?? undefined,
          lastName: currentUser.lastName ?? undefined,
          email: currentUser.email ?? undefined,
        };
        setSubscriberData(fallbackData);
      }

      setHasInitializedSubscriber(true);
    }
  }, [
    hasInitializedSubscriber,
    isOpen,
    workflow?.workflowId,
    currentEnvironment?._id,
    currentUser,
    subscriberData?.subscriberId,
    loadPersistedSubscriber,
  ]);

  // Handle fetched subscriber data and error cases
  useEffect(() => {
    if (fetchedSubscriberData && subscriberData?.subscriberId === fetchedSubscriberData.subscriberId) {
      // Update with fresh data from server
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
      currentUser
    ) {
      // Persisted subscriber doesn't exist, clear it and fallback to current user
      clearPersistedSubscriber();

      const fallbackData = {
        subscriberId: currentUser._id,
        firstName: currentUser.firstName ?? undefined,
        lastName: currentUser.lastName ?? undefined,
        email: currentUser.email ?? undefined,
      };
      setSubscriberData(fallbackData);
    }
  }, [
    fetchedSubscriberData,
    subscriberFetchError,
    subscriberData?.subscriberId,
    currentUser,
    clearPersistedSubscriber,
  ]);

  const payload = useMemo(() => {
    if (initialPayload && Object.keys(initialPayload).length > 0) {
      return initialPayload;
    }

    return getInitialPayload(workflow);
  }, [initialPayload, workflow, getInitialPayload]);

  const form = useForm<TestWorkflowFormType>({
    mode: 'onSubmit',
    resolver: zodResolver(buildPayloadOnlyFormSchema()),
    values: { payload: JSON.stringify(payload, null, 2) },
  });

  const { handleSubmit, watch } = form;

  const watchedPayload = watch('payload');
  useEffect(() => {
    if (!initialPayload && watchedPayload) {
      try {
        const parsedPayload = JSON.parse(watchedPayload);
        savePersistedPayload(parsedPayload);
      } catch {
        // Invalid JSON, don't persist
      }
    }
  }, [watchedPayload, initialPayload, savePersistedPayload]);

  const handleSubscriberSelect = useCallback(
    (subscriber: ISubscriberResponseDto) => {
      setSubscriberData(subscriber);
      // Persist the selected subscriber for future use
      savePersistedSubscriber(subscriber);
    },
    [savePersistedSubscriber]
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

  const onSubmit = async (data: TestWorkflowFormType) => {
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
        payload: data.payload,
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
      setCurrentFormData({ to: subscriberData, payload: JSON.stringify(data.payload, null, 2) });
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
      const formData = form.getValues();
      const curlCommand = generateTriggerCurlCommand({
        workflowId: workflow.workflowId,
        to: subscriberData,
        payload: formData.payload,
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
  }, [workflow?.workflowId, subscriberData, apiKey, form]);

  const handleOpenInPostman = useCallback(async () => {
    if (!workflow?.workflowId || !subscriberData) {
      showErrorToast('Workflow information or subscriber is missing');
      return;
    }

    try {
      const formData = form.getValues();

      const postmanCollection = generatePostmanCollection({
        workflowId: workflow.workflowId,
        to: subscriberData,
        payload: formData.payload,
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
  }, [workflow?.workflowId, subscriberData, apiKey, form]);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent ref={forwardedRef} className="w-[500px]">
        <VisuallyHidden>
          <SheetTitle>Test Workflow</SheetTitle>
          <SheetDescription>Configure and test your workflow</SheetDescription>
        </VisuallyHidden>

        <Form {...form}>
          <FormRoot onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
            <TestWorkflowContent
              workflow={workflow}
              subscriberData={subscriberData}
              isLoadingSubscriber={isLoadingSubscriber}
              onOpenSubscriberDrawer={() => setIsSubscriberDrawerOpen(true)}
              onSubscriberSelect={handleSubscriberSelect}
            />

            <div className="border-t border-neutral-200 bg-white">
              <div className="flex items-center justify-end px-3 py-1.5">
                <ButtonGroupRoot size="xs">
                  <ButtonGroupItem asChild>
                    <Button
                      type="submit"
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
                      <DropdownMenuContent align="end">
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
          </FormRoot>
        </Form>
      </SheetContent>

      <TestWorkflowActivityDrawer
        isOpen={isActivityDrawerOpen}
        onOpenChange={setIsActivityDrawerOpen}
        transactionId={transactionId}
        workflow={workflow}
        to={currentFormData?.to as Record<string, string>}
        payload={currentFormData?.payload}
      />

      <SubscriberDrawer
        open={isSubscriberDrawerOpen}
        onOpenChange={handleSubscriberDrawerClose}
        subscriberId={subscriberData?.subscriberId || ''}
        closeOnSave={true}
      />
    </Sheet>
  );
});

TestWorkflowDrawer.displayName = 'TestWorkflowDrawer';
