import type { IIntegration } from '@novu/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { showSuccessToast } from '@/components/primitives/sonner-helpers';
import { useSetPrimaryIntegration } from '@/hooks/use-set-primary-integration';
import { QueryKeys } from '@/utils/query-keys';
import { handleIntegrationError } from '../utils/handle-integration-error';
import { channelNoun } from '../utils/helpers';

/**
 * "Make primary", confirmed in a modal and applied right away: from a card's star or menu, or the manage drawer. The
 * API moves primary within the integration's own environment.
 */
export function useMakePrimary(integration?: IIntegration) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const { mutateAsync: setPrimaryIntegration, isPending } = useSetPrimaryIntegration();

  const confirm = async () => {
    if (!integration) return;

    try {
      await setPrimaryIntegration({ integrationId: integration._id });
      const noun = channelNoun(integration.channel);
      showSuccessToast(`${integration.name} is now the primary ${noun ? `${noun} ` : ''}integration.`);
      setIsOpen(false);
    } catch (error: unknown) {
      handleIntegrationError(error, 'update');
    } finally {
      // Primary can move in any environment, and making one primary clears its conditions, which workflows show.
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchIntegrations] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchWorkflow] });
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
