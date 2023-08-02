import { useState, useCallback } from 'react';
import { useDisclosure } from '@mantine/hooks';

import { useInlineComponent, useIsMultiProviderConfigurationEnabled } from '../../../../hooks';
import { ISelectPrimaryIntegrationModalProps, SelectPrimaryIntegrationModal } from './SelectPrimaryIntegrationModal';

export const useSelectPrimaryIntegrationModal = () => {
  const [opened, { open, close }] = useDisclosure(false);
  const [{ environmentId, channelType, onClose }, setModalProps] = useState<
    Partial<Pick<ISelectPrimaryIntegrationModalProps, 'environmentId' | 'channelType' | 'onClose'>>
  >({});
  const isMultiProviderConfigurationEnabled = useIsMultiProviderConfigurationEnabled();
  const isOpened = opened && isMultiProviderConfigurationEnabled;

  const onCloseCallback = useCallback(() => {
    close();
    onClose?.();
  }, [close, onClose]);

  const Component = useInlineComponent<ISelectPrimaryIntegrationModalProps>(SelectPrimaryIntegrationModal, {
    isOpened,
    environmentId,
    channelType,
    onClose: onCloseCallback,
  });

  const openModalCallback = useCallback(
    (props: Pick<ISelectPrimaryIntegrationModalProps, 'environmentId' | 'channelType' | 'onClose'>) => {
      setModalProps({ ...props });
      open();
    },
    [open]
  );

  return {
    SelectPrimaryIntegrationModal: Component,
    openModal: openModalCallback,
    closeModal: close,
  };
};
