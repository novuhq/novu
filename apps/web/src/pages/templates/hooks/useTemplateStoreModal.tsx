import { useDisclosure } from '@mantine/hooks';

import { useInlineComponent } from '../../../hooks';
import { ITemplatesStoreModalProps, TemplatesStoreModal } from '../components/templates-store';

const NULL_COMPONENT = () => null;

export const useTemplateStoreModal = () => {
  const [isOpened, { open, close }] = useDisclosure(true);

  const Component = useInlineComponent<ITemplatesStoreModalProps>(TemplatesStoreModal, {
    isOpened,
    onClose: close,
  });

  return {
    TemplatesStoreModal: isOpened ? Component : NULL_COMPONENT,
    openModal: open,
    closeModal: close,
  };
};
