import { forwardRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createMockObjectFromSchema, type WorkflowTestDataResponseDto, FeatureFlagsKeysEnum } from '@novu/shared';

import { Button } from '@/components/primitives/button';
import { Form, FormRoot } from '@/components/primitives/form/form';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/primitives/sheet';
import { VisuallyHidden } from '@/components/primitives/visually-hidden';
import { ToastClose, ToastIcon } from '@/components/primitives/sonner';
import { showErrorToast, showToast } from '@/components/primitives/sonner-helpers';
import { buildDynamicFormSchema, TestWorkflowFormType } from '@/components/workflow-editor/schema';
import { TestWorkflowContent } from '@/components/workflow-editor/test-workflow/test-workflow-content';
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
      <SheetContent ref={forwardedRef} className="w-[500px]">
        <VisuallyHidden>
          <SheetTitle>Test Workflow</SheetTitle>
          <SheetDescription>Configure and test your workflow</SheetDescription>
        </VisuallyHidden>

        <Form {...form}>
          <FormRoot onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
            <TestWorkflowContent workflow={workflow} />

            {/* Footer */}
            <div className="border-t border-neutral-200 bg-white">
              <div className="flex items-center justify-between px-3 py-1.5">
                <Button type="button" variant="secondary" mode="ghost" size="xs" className="gap-1 text-neutral-600">
                  <RiPlayCircleLine className="h-4 w-4" />
                  View docs
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="xs"
                  mode="gradient"
                  isLoading={isPending}
                  className="gap-1"
                >
                  Test workflow
                  <RiPlayCircleLine className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </FormRoot>
        </Form>
      </SheetContent>
    </Sheet>
  );
});

TestWorkflowDrawer.displayName = 'TestWorkflowDrawer';
