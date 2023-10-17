import { useState, useCallback } from 'react';
import { useDisclosure } from '@mantine/hooks';

import { useInlineComponent, useIsMultiProviderConfigurationEnabled } from '../../../../hooks';
import { IDisablePrimaryStatusModal, DisablePrimaryStatusModal } from './DisablePrimaryStatusModal';

export const useDisablePrimaryStatusModal = () => {
  const [opened, { open, close }] = useDisclosure(false);
  const [{ onConfirm }, setModalProps] = useState<Partial<Pick<IDisablePrimaryStatusModal, 'onConfirm'>>>({});
  const isMultiProviderConfigurationEnabled = useIsMultiProviderConfigurationEnabled();
  const isOpened = opened && isMultiProviderConfigurationEnabled;

  const onConfirmCallback = useCallback(() => {
    close();
    onConfirm?.();
  }, [close, onConfirm]);

  const Component = useInlineComponent<IDisablePrimaryStatusModal>(DisablePrimaryStatusModal, {
    isOpened,
    onConfirm: onConfirmCallback,
    onDismiss: close,
  });

  const openModalCallback = useCallback(
    (props: Pick<IDisablePrimaryStatusModal, 'onConfirm'>) => {
      setModalProps({ ...props });
      open();
    },
    [open]
  );

  return {
    DisablePrimaryStatusModal: Component,
    openModal: openModalCallback,
    closeModal: close,
  };
};
