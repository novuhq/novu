import { ConfirmationModal } from '@/components/confirmation-modal';
import { SelectPrimaryIntegrationModal } from './select-primary-integration-modal';
import { IIntegration } from '@novu/shared';
import { useState } from 'react';

export type DeleteIntegrationModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (newPrimaryIntegrationId?: string) => void;
  isPrimary?: boolean;
  otherIntegrations?: IIntegration[];
};

export function DeleteIntegrationModal({
  isOpen,
  onOpenChange,
  onConfirm,
  isPrimary,
  otherIntegrations = [],
}: DeleteIntegrationModalProps) {
  const [isSelectPrimaryModalOpen, setIsSelectPrimaryModalOpen] = useState(false);
  const hasOtherIntegrations = otherIntegrations.length > 0;

  const description = isPrimary ? (
    <>
      <p>Are you sure you want to delete this primary integration?</p>
      <p>
        {hasOtherIntegrations
          ? 'You will need to select a new primary integration for this channel.'
          : 'This will disable the channel until you set up a new integration.'}
      </p>
    </>
  ) : (
    <p>Are you sure you want to delete this integration?</p>
  );

  const handleConfirm = () => {
    if (isPrimary && hasOtherIntegrations) {
      setIsSelectPrimaryModalOpen(true);

      return;
    }

    onConfirm();
  };

  return (
    <>
      <ConfirmationModal
        open={isOpen}
        onOpenChange={onOpenChange}
        onConfirm={handleConfirm}
        title={`Delete ${isPrimary ? 'Primary ' : ''}Integration`}
        description={description}
        confirmButtonText="Delete Integration"
      />

      <SelectPrimaryIntegrationModal
        isOpen={isSelectPrimaryModalOpen}
        onOpenChange={setIsSelectPrimaryModalOpen}
        onConfirm={(newPrimaryIntegrationId) => {
          setIsSelectPrimaryModalOpen(false);
          onConfirm(newPrimaryIntegrationId);
        }}
        otherIntegrations={otherIntegrations}
        mode="select"
      />
    </>
  );
}
