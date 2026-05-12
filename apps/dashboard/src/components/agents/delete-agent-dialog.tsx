import { Cross2Icon } from '@radix-ui/react-icons';
import { useEffect, useId, useState } from 'react';
import { RiAlertFill } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/primitives/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/primitives/radio-group';

type DeleteScope = 'novu-only' | 'provider-and-novu';

type DeleteAgentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (deleteFromProvider: boolean) => void;
  agentName: string;
  agentIdentifier: string;
  isDeleting?: boolean;
  /** Pass true for managed-runtime agents to show the provider deletion option. */
  isManagedAgent?: boolean;
};

export function DeleteAgentDialog({
  open,
  onOpenChange,
  onConfirm,
  agentName,
  agentIdentifier,
  isDeleting,
  isManagedAgent,
}: DeleteAgentDialogProps) {
  const [scope, setScope] = useState<DeleteScope>('novu-only');
  const novuOnlyId = useId();
  const providerAndNovuId = useId();

  // Reset scope when dialog is closed (or when the agent is no longer managed)
  // so a stale 'provider-and-novu' value doesn't leak into the next open.
  useEffect(() => {
    if (!open || !isManagedAgent) {
      setScope('novu-only');
    }
  }, [open, isManagedAgent]);

  function handleConfirm() {
    onConfirm(isManagedAgent ? scope === 'provider-and-novu' : false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setScope('novu-only');
    }

    onOpenChange(nextOpen);
  }

  return (
    <Dialog modal open={open} onOpenChange={handleOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="max-w-[440px] gap-4 rounded-xl! p-4 overflow-hidden" hideCloseButton>
          <div className="flex items-start justify-between">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-warning/10">
              <RiAlertFill className="size-6 text-warning" />
            </div>
            <DialogClose>
              <Cross2Icon className="size-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>

          <div className="flex min-w-0 flex-col gap-1 overflow-hidden">
            <DialogTitle className="text-md font-medium tracking-normal">Delete agent?</DialogTitle>
            <DialogDescription className="text-foreground-600 min-w-0 overflow-hidden">
              This will permanently delete <span className="font-semibold">{agentName}</span>{' '}
              <span className="font-mono text-label-xs">({agentIdentifier})</span> and remove its integration links.
            </DialogDescription>
          </div>

          {isManagedAgent && (
            <RadioGroup
              value={scope}
              onValueChange={(value) => setScope(value as DeleteScope)}
              className="flex flex-col gap-3"
            >
              <label
                htmlFor={novuOnlyId}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-neutral-200 p-3 has-[[data-state=checked]]:border-neutral-400"
              >
                <RadioGroupItem value="novu-only" id={novuOnlyId} className="mt-0.5 shrink-0" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-label-sm font-medium">Delete from Novu only</span>
                  <span className="text-foreground-600 text-label-xs">
                    Remove the agent record from Novu. The agent remains active on the provider side (e.g. Anthropic).
                  </span>
                </div>
              </label>

              <label
                htmlFor={providerAndNovuId}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-neutral-200 p-3 has-[[data-state=checked]]:border-neutral-400"
              >
                <RadioGroupItem value="provider-and-novu" id={providerAndNovuId} className="mt-0.5 shrink-0" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-label-sm font-medium">Delete from Novu and provider</span>
                  <span className="text-foreground-600 text-label-xs">
                    Remove the agent record from Novu and permanently archive it on the provider side. This cannot be
                    undone.
                  </span>
                </div>
              </label>
            </RadioGroup>
          )}

          <DialogFooter>
            <DialogClose asChild aria-label="Close">
              <Button
                type="button"
                size="sm"
                mode="outline"
                variant="secondary"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleOpenChange(false);
                }}
              >
                Cancel
              </Button>
            </DialogClose>

            <Button
              type="button"
              size="sm"
              variant="error"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleConfirm();
              }}
              isLoading={isDeleting}
            >
              Delete agent
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
