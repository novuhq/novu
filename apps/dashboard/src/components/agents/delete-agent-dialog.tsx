import { useEffect, useState } from 'react';
import type { AgentResponse } from '@/api/agents';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { Checkbox } from '@/components/primitives/checkbox';
import { Label } from '@/components/primitives/label';

export function shouldShowManagedAgentProviderDeleteOption(
  agent: Pick<AgentResponse, 'runtime' | 'managedRuntime'> | null | undefined
): boolean {
  if (!agent) {
    return false;
  }

  if (agent.runtime === 'self-hosted') {
    return false;
  }

  return agent.runtime === 'managed' || Boolean(agent.managedRuntime);
}

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

  useEffect(() => {
    if (!open) {
      return;
    }

    setDeleteFromProvider(Boolean(isManagedRuntime));
  }, [open, isManagedRuntime]);

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
            This will permanently delete <span className="font-semibold">{agentName}</span>{' '}
            <span className="font-mono text-label-xs">({agentIdentifier})</span> and remove its integration links.
          </p>
          {isManagedRuntime && (
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={deleteFromProvider}
                onCheckedChange={(checked) => setDeleteFromProvider(checked === true)}
              />
              <Label className="cursor-pointer text-foreground-600 text-sm font-normal">
                Also delete from provider
              </Label>
            </label>
          )}
        </div>
      }
      confirmButtonText="Delete agent"
      isLoading={isDeleting}
      confirmButtonVariant="error"
    />
  );
}
