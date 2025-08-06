import { IIntegration } from '@novu/shared';
import { useState } from 'react';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';

export type SelectPrimaryIntegrationModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (newPrimaryIntegrationId?: string) => void;
  currentPrimaryName?: string;
  newPrimaryName?: string;
  isLoading?: boolean;
  otherIntegrations?: IIntegration[];
  mode?: 'switch' | 'select';
};

export function SelectPrimaryIntegrationModal({
  isOpen,
  onOpenChange,
  onConfirm,
  currentPrimaryName,
  newPrimaryName,
  isLoading,
  otherIntegrations = [],
  mode = 'switch',
}: SelectPrimaryIntegrationModalProps) {
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string>('');

  const description =
    mode === 'switch' ? (
      <>
        <p>
          This will change the primary integration from <span className="font-medium">{currentPrimaryName}</span> to{' '}
          <span className="font-medium">{newPrimaryName}</span>.
        </p>
        <p>
          The current primary integration will be disabled and all future notifications will be sent through the new
          primary integration.
        </p>
      </>
    ) : (
      <>
        <p>Please select a new primary integration for this channel.</p>
        <p>All future notifications will be sent through the selected integration.</p>
        <div className="mt-4">
          <Select value={selectedIntegrationId} onValueChange={setSelectedIntegrationId}>
            <SelectTrigger>
              <SelectValue placeholder="Select an integration" />
            </SelectTrigger>
            <SelectContent>
              {otherIntegrations.map((integration) => (
                <SelectItem key={integration._id} value={integration._id}>
                  {integration.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </>
    );

  return (
    <ConfirmationModal
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setSelectedIntegrationId('');
        }

        onOpenChange(open);
      }}
      onConfirm={() => onConfirm(mode === 'select' ? selectedIntegrationId : undefined)}
      title={mode === 'switch' ? 'Change Primary Integration' : 'Select Primary Integration'}
      description={description}
      confirmButtonText="Continue"
      isLoading={isLoading}
      isConfirmDisabled={mode === 'select' && !selectedIntegrationId}
    />
  );
}
