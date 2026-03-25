import { ReactNode } from 'react';
import { RiArrowRightSLine, RiRouteFill } from 'react-icons/ri';
import { ConfirmationModal } from './confirmation-modal';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './primitives/accordion';
import { Skeleton } from './primitives/skeleton';
import TruncatedText from './truncated-text';

type WorkflowReference = {
  workflowId: string;
  name: string;
};

type DeleteResourceConfirmationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  resourceName: string;
  resourceLabel: string;
  deleteButtonText: string;
  impactDescription?: ReactNode;
  workflows: WorkflowReference[];
  isUsageLoading: boolean;
  isDeleting?: boolean;
};

export const DeleteResourceConfirmationDialog = ({
  open,
  onOpenChange,
  onConfirm,
  resourceName,
  resourceLabel,
  deleteButtonText,
  impactDescription,
  workflows,
  isUsageLoading,
  isDeleting,
}: DeleteResourceConfirmationDialogProps) => {
  const getDescription = (): ReactNode => {
    const baseText = (
      <>
        You're about to delete the <TruncatedText className="max-w-[32ch] font-semibold">{resourceName}</TruncatedText>{' '}
        {resourceLabel}, this action is permanent.
      </>
    );

    if (isUsageLoading) {
      return (
        <>
          {baseText}
          <br />
          <br />
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </>
      );
    }

    if (workflows.length === 0) {
      return baseText;
    }

    return (
      <>
        {baseText}
        <br />
        <br />
        This change will affect{' '}
        <b>
          {workflows.length} workflow{workflows.length > 1 ? 's' : ''}
        </b>{' '}
        {impactDescription} and may cause breaking behavior. Please review dependent workflows before proceeding.
        <br />
        <br />
        <Accordion type="single" collapsible defaultValue="resource">
          <AccordionItem value="resource">
            <AccordionTrigger>
              <div className="flex items-center gap-1 text-xs">This affects the following workflows</div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="max-h-64 w-full space-y-1 overflow-y-auto overflow-x-hidden rounded border border-neutral-200 bg-white p-0.5">
                {workflows.map((workflow, index) => (
                  <div
                    key={workflow.workflowId}
                    className={`flex items-center gap-1 p-1 ${index > 0 ? 'border-t border-neutral-100' : ''}`}
                  >
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                      <RiRouteFill className="text-feature h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <TruncatedText className="max-w-[200px] text-xs font-medium text-neutral-900">
                        {workflow.name}
                      </TruncatedText>
                      <p className="truncate font-mono text-xs text-neutral-500">{workflow.workflowId}</p>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </>
    );
  };

  return (
    <ConfirmationModal
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="Are you sure?"
      description={getDescription()}
      confirmButtonText={workflows.length === 0 || isUsageLoading ? deleteButtonText : 'Proceed'}
      confirmTrailingIcon={RiArrowRightSLine}
      isLoading={isDeleting}
      isConfirmDisabled={isUsageLoading}
    />
  );
};
