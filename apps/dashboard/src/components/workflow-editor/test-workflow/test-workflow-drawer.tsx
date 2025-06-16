import { forwardRef, useMemo, useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createMockObjectFromSchema,
  type WorkflowTestDataResponseDto,
  type ISubscriberResponseDto,
} from '@novu/shared';

import { Button } from '@/components/primitives/button';
import { Form, FormRoot } from '@/components/primitives/form/form';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/primitives/sheet';
import { VisuallyHidden } from '@/components/primitives/visually-hidden';
import { ToastClose, ToastIcon } from '@/components/primitives/sonner';
import { showErrorToast, showToast } from '@/components/primitives/sonner-helpers';
import { buildDynamicFormSchema, TestWorkflowFormType } from '@/components/workflow-editor/schema';
import { TestWorkflowContent } from '@/components/workflow-editor/test-workflow/test-workflow-content';
import { TestWorkflowActivityDrawer } from '@/components/workflow-editor/test-workflow/test-workflow-activity-drawer';
import { SubscriberDrawer } from '@/components/subscribers/subscriber-drawer';
import { useTriggerWorkflow } from '@/hooks/use-trigger-workflow';
import { useIsPayloadSchemaEnabled } from '@/hooks/use-is-payload-schema-enabled';
import { useWorkflowPayloadPersistence } from '@/hooks/use-workflow-payload-persistence';
import { useFetchSubscriber } from '@/hooks/use-fetch-subscriber';
import { useAuth } from '@/context/auth/hooks';
import { useWorkflow } from '../workflow-provider';
import { RiPlayCircleLine } from 'react-icons/ri';
import { PayloadData } from '@/components/workflow-editor/steps/types/preview-context.types';
import { useEnvironment } from '../../../context/environment/hooks';

type TestWorkflowDrawerProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  testData?: WorkflowTestDataResponseDto;
  initialPayload?: PayloadData;
};

export const TestWorkflowDrawer = forwardRef<HTMLDivElement, TestWorkflowDrawerProps>((props, forwardedRef) => {
  const { isOpen, onOpenChange, testData, initialPayload } = props;
  const [transactionId, setTransactionId] = useState<string>();
  const { currentEnvironment } = useEnvironment();

  const { workflow } = useWorkflow();
  const { currentUser } = useAuth();
  const isPayloadSchemaEnabled = useIsPayloadSchemaEnabled();
  const { triggerWorkflow, isPending } = useTriggerWorkflow();

  // Add workflow-level payload persistence
  const { getInitialPayload, savePersistedPayload } = useWorkflowPayloadPersistence({
    workflowId: workflow?.workflowId || '',
    environmentId: currentEnvironment?._id || '',
  });
  const [isActivityDrawerOpen, setIsActivityDrawerOpen] = useState(false);
  const [currentFormData, setCurrentFormData] = useState<TestWorkflowFormType | null>(null);
  const [isSubscriberDrawerOpen, setIsSubscriberDrawerOpen] = useState(false);
  const [subscriberData, setSubscriberData] = useState<Partial<ISubscriberResponseDto> | null>(null);

  const subscriberIdToFetch = subscriberData?.subscriberId || currentUser?._id || '';
  const {
    data: fetchedSubscriberData,
    refetch: refetchSubscriber,
    isLoading: isLoadingSubscriber,
  } = useFetchSubscriber({
    subscriberId: subscriberIdToFetch,
    options: {
      enabled: !!subscriberIdToFetch && !!currentEnvironment,
    },
  });

  // Set subscriber data when fetched subscriber data is loaded
  useEffect(() => {
    if (fetchedSubscriberData) {
      setSubscriberData({
        subscriberId: fetchedSubscriberData.subscriberId || '',
        firstName: fetchedSubscriberData.firstName || '',
        lastName: fetchedSubscriberData.lastName || '',
        email: fetchedSubscriberData.email || '',
        phone: fetchedSubscriberData.phone || '',
        avatar: fetchedSubscriberData.avatar || '',
        locale: fetchedSubscriberData.locale || undefined,
        timezone: fetchedSubscriberData.timezone || undefined,
        data: fetchedSubscriberData.data,
      });
    } else if (currentUser && !fetchedSubscriberData && !subscriberData?.subscriberId && !isLoadingSubscriber) {
      // If no subscriber found but we have current user, use user data as fallback
      setSubscriberData({
        subscriberId: currentUser._id,
        firstName: currentUser.firstName || '',
        lastName: currentUser.lastName || '',
        email: currentUser.email || '',
        phone: '',
        avatar: '',
        locale: '',
        timezone: '',
        data: {},
      });
    }
  }, [fetchedSubscriberData, currentUser, subscriberData?.subscriberId, isLoadingSubscriber]);

  const handleSubscriberSelect = useCallback((subscriber: ISubscriberResponseDto) => {
    setSubscriberData(subscriber);
  }, []);

  const to = useMemo(() => createMockObjectFromSchema(testData?.to ?? {}), [testData]);

  const payload = useMemo(() => {
    // Priority: initialPayload (from step editor) > persisted > payloadExample > empty
    if (initialPayload && Object.keys(initialPayload).length > 0) {
      return initialPayload;
    }

    // Use workflow-level persistence when no initialPayload
    return getInitialPayload(workflow);
  }, [initialPayload, workflow, getInitialPayload]);

  const form = useForm<TestWorkflowFormType>({
    mode: 'onSubmit',
    resolver: zodResolver(buildDynamicFormSchema({ to: testData?.to ?? {} })),
    values: { to, payload: JSON.stringify(payload, null, 2) },
  });

  const { handleSubmit, watch } = form;

  // Watch for payload changes and persist them (only when not from step editor)
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

  const handleSubscriberDrawerClose = useCallback(
    (open: boolean) => {
      setIsSubscriberDrawerOpen(open);

      // Refetch subscriber data when drawer closes to get latest updates
      if (!open && subscriberData?.subscriberId) {
        refetchSubscriber();
      }
    },
    [refetchSubscriber, subscriberData?.subscriberId]
  );

  const onSubmit = async (data: TestWorkflowFormType) => {
    try {
      const {
        data: { transactionId: newTransactionId },
      } = await triggerWorkflow({ name: workflow?.workflowId ?? '', to: data.to, payload: data.payload });

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
      setCurrentFormData(data);
      setIsActivityDrawerOpen(true);
    } catch (e) {
      showErrorToast(
        e instanceof Error ? e.message : 'There was an error triggering the workflow.',
        'Failed to trigger workflow'
      );
    }
  };

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

            {/* Footer */}
            <div className="border-t border-neutral-200 bg-white">
              <div className="flex items-center justify-between px-3 py-1.5">
                <Button
                  type="submit"
                  variant="secondary"
                  size="xs"
                  mode="gradient"
                  isLoading={isPending}
                  className="ml-auto gap-1"
                >
                  Test workflow
                  <RiPlayCircleLine className="h-4 w-4" />
                </Button>
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
        to={currentFormData?.to}
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
