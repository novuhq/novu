import { IResponseError } from '@novu/shared';
import { getApiKeys, regenerateApiKeys } from '@novu/shared-web';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { showNotification } from '@mantine/notifications';

export const useRegenerateApiKeyModal = () => {
  const [isOpen, setModalIsOpen] = useState(false);

  const { refetch: refetchApiKeys } = useQuery<{ key: string }[]>(['getApiKeys'], getApiKeys);

  const { mutateAsync: regenerateApiKeysMutation } = useMutation<{ key: string }[], IResponseError>(regenerateApiKeys);

  async function openModal() {
    setModalIsOpen(true);
  }

  function cancelAction() {
    setModalIsOpen(false);
  }

  async function confirmAction() {
    await regenerateApiKeysMutation();
    await refetchApiKeys();
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
