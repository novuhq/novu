import { IResponseError } from '@novu/shared';
import { regenerateApiKeys } from '../../../api';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useApiKeys } from '../../../hooks';

import { showNotification } from '@mantine/notifications';

export const useRegenerateSecretKeyModal = () => {
  const [isOpen, setModalIsOpen] = useState(false);
  const { refetch: refetchSecretKeys } = useApiKeys();
  const { mutateAsync: regenerateApiKeysMutation } = useMutation<{ key: string }[], IResponseError>(regenerateApiKeys);

  async function openModal() {
    setModalIsOpen(true);
  }

  function cancelAction() {
    setModalIsOpen(false);
  }

  async function confirmAction() {
    await regenerateApiKeysMutation();
    await refetchSecretKeys();
    setModalIsOpen(false);
    showNotification({
      message: `Successfully regenerated API keys!`,
      color: 'green',
    });
  }

  return {
    isOpen,
    openModal,
    cancelAction,
    confirmAction,
  };
};
