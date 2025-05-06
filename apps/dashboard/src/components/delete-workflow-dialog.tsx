import { WorkflowListResponseDto, WorkflowResponseDto } from '@novu/shared';
import { ConfirmationModal } from './confirmation-modal';
import TruncatedText from './truncated-text';

type DeleteWorkflowDialogProps = {
  workflow: WorkflowResponseDto | WorkflowListResponseDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading?: boolean;
};

export const DeleteWorkflowDialog = ({
  workflow,
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: DeleteWorkflowDialogProps) => {
  return (
    <ConfirmationModal
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="Are you sure?"
      description={
        <>
          You're about to delete the <TruncatedText className="max-w-[32ch] font-bold">{workflow.name}</TruncatedText>{' '}
          workflow, this action is permanent. <br />
          <br />
          You won't be able to trigger this workflow anymore.
        </>
      }
      confirmButtonText="Delete"
      isLoading={isLoading}
    />
  );
};
