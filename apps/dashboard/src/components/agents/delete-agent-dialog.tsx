import { ConfirmationModal } from '@/components/confirmation-modal';

type DeleteAgentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  agentName: string;
  agentIdentifier: string;
  isDeleting?: boolean;
};

export function DeleteAgentDialog({
  open,
  onOpenChange,
  onConfirm,
  agentName,
  agentIdentifier,
  isDeleting,
}: DeleteAgentDialogProps) {
  return (
    <ConfirmationModal
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="Delete agent?"
      description={
        <>
          This will permanently delete <span className="font-semibold">{agentName}</span>{' '}
          <span className="font-mono text-label-xs">({agentIdentifier})</span> and remove its integration links.
        </>
      }
      confirmButtonText="Delete agent"
      isLoading={isDeleting}
      confirmButtonVariant="error"
    />
  );
}
