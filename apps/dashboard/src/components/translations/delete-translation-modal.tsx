import { TranslationGroupDto } from '@novu/api/models/components';
import { ConfirmationModal } from '../confirmation-modal';

type DeleteTranslationGroupDialogProps = {
  translationGroup: TranslationGroupDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
};

export function DeleteTranslationGroupDialog({
  translationGroup,
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: DeleteTranslationGroupDialogProps) {
  return (
    <ConfirmationModal
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="Delete translation group"
      description={
        <span>
          Are you sure you want to delete all translations for{' '}
          <span className="font-bold">{translationGroup.resourceName}</span>? This action cannot be undone and will
          disable translations for this workflow, removing all locale translations and reverting to the default content.
        </span>
      }
      confirmButtonText="Delete translation group"
      isLoading={isLoading}
    />
  );
}
