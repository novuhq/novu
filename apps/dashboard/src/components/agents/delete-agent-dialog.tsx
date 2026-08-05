import { useState } from 'react';
import { RiRouteFill } from 'react-icons/ri';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/primitives/accordion';
import { Checkbox } from '@/components/primitives/checkbox';
import { Label } from '@/components/primitives/label';
import { Skeleton } from '@/components/primitives/skeleton';
import TruncatedText from '@/components/truncated-text';
import { useFetchAgentUsage } from '@/hooks/use-fetch-agent-usage';

type DeleteAgentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (options: { deleteFromProvider: boolean }) => void;
  agentName: string;
  agentIdentifier: string;
  isDeleting?: boolean;
  isManagedRuntime?: boolean;
};

export function DeleteAgentDialog({
  open,
  onOpenChange,
  onConfirm,
  agentName,
  agentIdentifier,
  isDeleting,
  isManagedRuntime,
}: DeleteAgentDialogProps) {
  const [deleteFromProvider, setDeleteFromProvider] = useState(false);
  const { usage, isPending: isUsageLoading } = useFetchAgentUsage({
    agentIdentifier,
    enabled: open && Boolean(agentIdentifier),
  });
  const workflows = usage?.workflows ?? [];

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      setDeleteFromProvider(false);
    }
    onOpenChange(isOpen);
  }

  return (
    <ConfirmationModal
      open={open}
      onOpenChange={handleOpenChange}
      onConfirm={() => onConfirm({ deleteFromProvider })}
      title="Delete agent?"
      description={
        <div className="flex flex-col gap-3">
          <p>
            This will permanently delete{' '}
            <TruncatedText className="max-w-[32ch] font-semibold">{agentName}</TruncatedText>{' '}
            <span className="font-mono text-label-xs">
              (<TruncatedText className="max-w-[32ch] font-normal">{agentIdentifier}</TruncatedText>)
            </span>{' '}
            and remove its integration links.
          </p>
          {isUsageLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : null}
          {!isUsageLoading && workflows.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p>
                This agent is assigned to{' '}
                <span className="font-semibold">
                  {workflows.length} workflow{workflows.length > 1 ? 's' : ''}
                </span>
                . Deleting it will also remove it from those workflows.
              </p>
              <Accordion type="single" collapsible defaultValue="workflows">
                <AccordionItem value="workflows">
                  <AccordionTrigger>
                    <div className="flex items-center gap-1 text-xs">Assigned workflows</div>
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
            </div>
          ) : null}
          {isManagedRuntime && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="delete-from-provider"
                checked={deleteFromProvider}
                onCheckedChange={(checked) => setDeleteFromProvider(checked === true)}
              />
              <Label htmlFor="delete-from-provider" className="cursor-pointer text-foreground-600 text-sm font-normal">
                Also delete from provider
              </Label>
            </div>
          )}
        </div>
      }
      confirmButtonText="Delete agent"
      isLoading={isDeleting}
      isConfirmDisabled={isUsageLoading}
      confirmButtonVariant="error"
    />
  );
}
