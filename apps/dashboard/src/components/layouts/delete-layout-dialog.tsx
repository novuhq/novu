import { LayoutResponseDto } from '@novu/shared';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchLayoutUsage } from '@/hooks/use-fetch-layout-usage';
import { DeleteResourceConfirmationDialog } from '../delete-resource-confirmation-dialog';

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

  return (
    <DeleteResourceConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      resourceName={layout.name}
      resourceLabel="layout"
      deleteButtonText="Delete layout"
      impactDescription={
        <>
          in <b>{currentEnvironment?.name}</b>
        </>
      }
      workflows={usage?.workflows ?? []}
      isUsageLoading={isUsagePending}
      isDeleting={isLoading}
    />
  );
};
