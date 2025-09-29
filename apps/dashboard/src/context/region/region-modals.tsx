import { RiAddLine } from 'react-icons/ri';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { type OrgCreationModalState } from './region-types';

interface RegionModalsProps {
  orgCreationModal: OrgCreationModalState;
  onCancelOrgCreation: () => void;
  onConfirmOrgCreation: () => void;
}

export function RegionModals({ orgCreationModal, onCancelOrgCreation, onConfirmOrgCreation }: RegionModalsProps) {
  return (
    <ConfirmationModal
      open={orgCreationModal.open}
      onOpenChange={onCancelOrgCreation}
      onConfirm={onConfirmOrgCreation}
      title="Create Organization?"
      description={
        <>
          No organization was found in the{' '}
          <strong>{orgCreationModal.targetRegion === 'singapore' ? 'Singapore' : 'US'}</strong> region.
          <br />
          <br />
          Would you like to create a new organization in the{' '}
          <strong>{orgCreationModal.targetRegion === 'singapore' ? 'Singapore' : 'US'}</strong> region?
        </>
      }
      confirmButtonText="Create Organization"
      confirmTrailingIcon={RiAddLine}
    />
  );
}
