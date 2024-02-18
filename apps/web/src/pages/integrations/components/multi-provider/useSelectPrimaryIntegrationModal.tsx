import { useState, useCallback } from 'react';
import { useDisclosure } from '@mantine/hooks';

import { useInlineComponent } from '../../../../hooks';
import { ISelectPrimaryIntegrationModalProps, SelectPrimaryIntegrationModal } from './SelectPrimaryIntegrationModal';

export const useSelectPrimaryIntegrationModal = () => {
  const [isOpened, { open, close }] = useDisclosure(false);
  const [{ environmentId, channelType, exclude, onClose }, setModalProps] = useState<
    Partial<Pick<ISelectPrimaryIntegrationModalProps, 'environmentId' | 'channelType' | 'exclude' | 'onClose'>>
  >({});
  const onCloseCallback = useCallback(() => {
    close();
    onClose?.();
  }, [close, onClose]);

  const Component = useInlineComponent<ISelectPrimaryIntegrationModalProps>(SelectPrimaryIntegrationModal, {
    isOpened,
    environmentId,
    channelType,
    exclude,
    onClose: onCloseCallback,
  });

  const openModalCallback = useCallback(
    (props: Pick<ISelectPrimaryIntegrationModalProps, 'environmentId' | 'channelType' | 'exclude' | 'onClose'>) => {
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
