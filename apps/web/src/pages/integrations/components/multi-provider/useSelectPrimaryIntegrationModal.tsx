import { useState, useCallback } from 'react';
import { useDisclosure } from '@mantine/hooks';

import { useInlineComponent, useIsMultiProviderConfigurationEnabled } from '../../../../hooks';
import { ISelectPrimaryIntegrationModalProps, SelectPrimaryIntegrationModal } from './SelectPrimaryIntegrationModal';

export const useSelectPrimaryIntegrationModal = () => {
  const [opened, { open, close }] = useDisclosure(false);
  const [{ environmentId, channelType }, setModalProps] = useState<
    Pick<ISelectPrimaryIntegrationModalProps, 'environmentId' | 'channelType'>
  >({});
  const isMultiProviderConfigurationEnabled = useIsMultiProviderConfigurationEnabled();
  const isOpened = opened && isMultiProviderConfigurationEnabled;

  const Component = useInlineComponent<ISelectPrimaryIntegrationModalProps>(SelectPrimaryIntegrationModal, {
    isOpened,
    environmentId,
    channelType,
    onClose: close,
  });

  const openModalCallback = useCallback(
    (props: Pick<ISelectPrimaryIntegrationModalProps, 'environmentId' | 'channelType'>) => {
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
