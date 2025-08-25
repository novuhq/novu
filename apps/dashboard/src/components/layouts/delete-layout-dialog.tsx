import { LayoutResponseDto } from '@novu/shared';
import { RiArrowRightSLine, RiRouteFill } from 'react-icons/ri';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchLayoutUsage } from '@/hooks/use-fetch-layout-usage';
import { ConfirmationModal } from '../confirmation-modal';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../primitives/accordion';
import { Skeleton } from '../primitives/skeleton';
import TruncatedText from '../truncated-text';

type DeleteLayoutDialogProps = {
  layout: LayoutResponseDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading?: boolean;
};

export const DeleteLayoutDialog = ({ layout, open, onOpenChange, onConfirm, isLoading }: DeleteLayoutDialogProps) => {
  const { currentEnvironment } = useEnvironment();
  const { usage, isPending: isUsagePending } = useFetchLayoutUsage({
    layoutSlug: layout.slug,
    enabled: open,
  });

  const getDescription = () => {
    if (isUsagePending) {
      return (
        <>
          You're about to delete the <TruncatedText className="max-w-[32ch] font-bold">{layout.name}</TruncatedText>{' '}
          layout, this action is permanent.
          <br />
          <br />
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </>
      );
    }

    const workflowCount = usage?.workflows.length || 0;

    if (workflowCount === 0) {
      return (
        <>
          You're about to delete the <TruncatedText className="max-w-[32ch] font-bold">{layout.name}</TruncatedText>{' '}
          layout, this action is permanent.
        </>
      );
    }

    return (
      <>
        You're about to delete the <TruncatedText className="max-w-[32ch] font-bold">{layout.name}</TruncatedText>{' '}
        layout, this action is permanent.
        <br />
        <br />
        This change will affect{' '}
        <b>
          {workflowCount} workflow{workflowCount > 1 ? 's' : ''}
        </b>{' '}
        in <b>{currentEnvironment?.name}</b> and may cause breaking behavior. Please review dependent workflows before
        proceeding.
        <br />
        <br />
        <Accordion type="single" collapsible defaultValue="layout">
          <AccordionItem value="layout">
            <AccordionTrigger>
              <div className="flex items-center gap-1 text-xs">This affects the following workflows</div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="max-h-64 space-y-1 overflow-y-auto overflow-x-hidden rounded border border-neutral-200 bg-white p-0.5">
                {usage?.workflows.map((workflow, index) => (
                  <div
                    key={workflow.workflowId}
                    className={`flex items-center gap-1 p-1 ${index > 0 ? 'border-t border-neutral-100' : ''}`}
                  >
                    <div className="flex h-5 w-5 items-center justify-center">
                      <RiRouteFill className="text-feature h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <TruncatedText className="max-w-[200px] text-xs font-medium text-neutral-900">
                          {workflow.name}
                        </TruncatedText>
                      </div>
                      <div className="flex items-end gap-0.5">
                        <span className="font-mono text-xs text-neutral-500">{workflow.workflowId}</span>
                      </div>
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
      confirmButtonText={usage?.workflows.length === 0 || isUsagePending ? 'Delete layout' : 'Proceed'}
      confirmTrailingIcon={RiArrowRightSLine}
      isLoading={isLoading}
      isConfirmDisabled={isUsagePending}
    />
  );
};
