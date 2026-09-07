import type { EnvironmentVariableResponseDto } from '@/api/environment-variables';
import { useFetchEnvironmentVariableUsage } from '@/hooks/use-fetch-environment-variable-usage';
import { DeleteResourceConfirmationDialog } from '../delete-resource-confirmation-dialog';

type DeleteVariableDialogProps = {
  variable: EnvironmentVariableResponseDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading?: boolean;
};

export const DeleteVariableDialog = ({
  variable,
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: DeleteVariableDialogProps) => {
  const { usage, isPending: isUsagePending } = useFetchEnvironmentVariableUsage({
    variableKey: variable.key,
    enabled: open,
  });

  return (
    <DeleteResourceConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      resourceName={variable.key}
      resourceLabel="variable"
      deleteButtonText="Delete variable"
      impactDescription={
        <>
          that reference <b className="break-all">{`{{env.${variable.key}}}`}</b>
        </>
      }
      workflows={usage?.workflows ?? []}
      isUsageLoading={isUsagePending}
      isDeleting={isLoading}
    />
  );
};
