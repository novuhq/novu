import { forwardRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createMockObjectFromSchema, type WorkflowTestDataResponseDto, FeatureFlagsKeysEnum } from '@novu/shared';

import { Button } from '@/components/primitives/button';
import { Form, FormRoot } from '@/components/primitives/form/form';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/primitives/sheet';
import { VisuallyHidden } from '@/components/primitives/visually-hidden';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/primitives/resizable';
import { ToastClose, ToastIcon } from '@/components/primitives/sonner';
import { showErrorToast, showToast } from '@/components/primitives/sonner-helpers';
import { buildDynamicFormSchema, TestWorkflowFormType } from '@/components/workflow-editor/schema';
import { TestWorkflowForm } from '@/components/workflow-editor/test-workflow/test-workflow-form';
import { TestWorkflowLogsSidebar } from '@/components/workflow-editor/test-workflow/test-workflow-logs-sidebar';
import { useTriggerWorkflow } from '@/hooks/use-trigger-workflow';
import { useIsPayloadSchemaEnabled } from '@/hooks/use-is-payload-schema-enabled';
import { useWorkflow } from '../workflow-provider';
import { cn } from '@/utils/ui';
import { RiPlayCircleLine } from 'react-icons/ri';

type TestWorkflowDrawerProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  testData?: WorkflowTestDataResponseDto;
  transactionId?: string;
  onTransactionIdChange: (transactionId: string) => void;
};

export const TestWorkflowDrawer = forwardRef<HTMLDivElement, TestWorkflowDrawerProps>((props, forwardedRef) => {
  const { isOpen, onOpenChange, testData, transactionId, onTransactionIdChange } = props;
  const { workflow } = useWorkflow();
  const isPayloadSchemaEnabled = useIsPayloadSchemaEnabled();
  const { triggerWorkflow, isPending } = useTriggerWorkflow();

  const to = useMemo(() => createMockObjectFromSchema(testData?.to ?? {}), [testData]);

  const payload = useMemo(() => {
    // Use workflow payloadExample if available and feature flag is enabled
    if (isPayloadSchemaEnabled && workflow?.payloadExample) {
      return workflow.payloadExample;
    }

    // Fallback to test data payload
    return createMockObjectFromSchema(testData?.payload ?? {});
  }, [testData, workflow?.payloadExample, isPayloadSchemaEnabled]);

  const form = useForm<TestWorkflowFormType>({
    mode: 'onSubmit',
    resolver: zodResolver(buildDynamicFormSchema({ to: testData?.to ?? {} })),
    values: { to, payload: JSON.stringify(payload, null, 2) },
  });

  const { handleSubmit } = form;

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

      onTransactionIdChange(newTransactionId);
    } catch (e) {
      showErrorToast(
        e instanceof Error ? e.message : 'There was an error triggering the workflow.',
        'Failed to trigger workflow'
      );
    }
  };

  return (
    <Sheet modal={false} open={isOpen} onOpenChange={onOpenChange}>
      {/* Custom overlay since SheetOverlay does not work with modal={false} */}
      <div
        className={cn('fade-in animate-in fixed inset-0 z-50 bg-black/20 transition-opacity duration-300', {
          'pointer-events-none opacity-0': !isOpen,
        })}
      />
      <SheetContent ref={forwardedRef} className="w-3/4 sm:max-w-5xl">
        <VisuallyHidden>
          <SheetTitle>Test Workflow</SheetTitle>
          <SheetDescription>Configure and test your workflow</SheetDescription>
        </VisuallyHidden>

        <div className="flex h-full flex-col">
          <div className="border-b border-neutral-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Test Workflow</h2>
                <p className="text-sm text-neutral-600">Configure and trigger your workflow for testing</p>
              </div>
              <Form {...form}>
                <FormRoot onSubmit={handleSubmit(onSubmit)}>
                  <Button
                    type="submit"
                    variant="primary"
                    size="xs"
                    mode="gradient"
                    isLoading={isPending}
                    leadingIcon={RiPlayCircleLine}
                  >
                    Test workflow
                  </Button>
                </FormRoot>
              </Form>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <Form {...form}>
              <FormRoot onSubmit={handleSubmit(onSubmit)} className="flex h-full">
                <ResizablePanelGroup direction="horizontal">
                  <ResizablePanel defaultSize={70} minSize={40} className="h-full">
                    <div className="h-full overflow-auto p-6">
                      <TestWorkflowForm workflow={workflow} />
                    </div>
                  </ResizablePanel>
                  <ResizableHandle />
                  <ResizablePanel defaultSize={30} minSize={30} maxSize={50}>
                    <TestWorkflowLogsSidebar transactionId={transactionId} workflow={workflow} />
                  </ResizablePanel>
                </ResizablePanelGroup>
              </FormRoot>
            </Form>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
});

TestWorkflowDrawer.displayName = 'TestWorkflowDrawer';
