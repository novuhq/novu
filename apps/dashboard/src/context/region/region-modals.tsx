import { ConfirmationModal } from '@/components/confirmation-modal';
import { RiAddLine } from 'react-icons/ri';
import { getRegionConfig } from './region-config';
import { type OrgCreationModalState } from './region-types';

interface RegionModalsProps {
  orgCreationModal: OrgCreationModalState;
  onCancelOrgCreation: () => void;
  onConfirmOrgCreation: () => void;
}

export function RegionModals({ orgCreationModal, onCancelOrgCreation, onConfirmOrgCreation }: RegionModalsProps) {
  const regionName =
    getRegionConfig(orgCreationModal.targetRegion)?.name || orgCreationModal.targetRegion.toUpperCase();

  return (
    <ConfirmationModal
      open={orgCreationModal.open}
      onOpenChange={onCancelOrgCreation}
      onConfirm={onConfirmOrgCreation}
      title="Create Organization?"
      description={
        <>
          No organization was found in the <strong>{regionName}</strong> region.
          <br />
          <br />
          Would you like to create a new organization in the <strong>{regionName}</strong> region?
        </>
      }
      confirmButtonText="Create Organization"
      confirmTrailingIcon={RiAddLine}
    />
  );
}
