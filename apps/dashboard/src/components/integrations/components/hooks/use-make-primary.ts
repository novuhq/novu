import type { IIntegration } from '@novu/shared';
import { useState } from 'react';
import { showSuccessToast } from '@/components/primitives/sonner-helpers';
import { useSetPrimaryIntegration } from '@/hooks/use-set-primary-integration';
import { handleIntegrationError } from '../utils/handle-integration-error';

/**
 * "Make primary" from the manage drawer — its menu, or turning Primary on — confirmed in a modal and applied right
 * away, like the card's menu. The API moves primary within the integration's own environment.
 */
export function useMakePrimary(integration?: IIntegration) {
  const [isOpen, setIsOpen] = useState(false);
  const { mutateAsync: setPrimaryIntegration, isPending } = useSetPrimaryIntegration();

  const confirm = async () => {
    if (!integration) return;

    try {
      await setPrimaryIntegration({ integrationId: integration._id });
      showSuccessToast(`${integration.name} is now the primary integration.`);
      setIsOpen(false);
    } catch (error: unknown) {
      handleIntegrationError(error, 'update');
    }
  };

  return {
    isOpen,
    isPending,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    confirm,
  };
}
