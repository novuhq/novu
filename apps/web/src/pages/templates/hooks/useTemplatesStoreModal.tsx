import { useDisclosure } from '@mantine/hooks';

import { IBlueprintsGrouped } from '../../../api/hooks';
import { useInlineComponent } from '../../../hooks';
import { ITemplatesStoreModalProps, TemplatesStoreModal } from '../components/templates-store';

const NULL_COMPONENT = () => null;

export const useTemplatesStoreModal = ({ general = [] }: { general?: IBlueprintsGrouped[] }) => {
  const [isOpened, { open, close }] = useDisclosure(false);
  const hasGroups = general && general.length > 0;

  const Component = useInlineComponent<ITemplatesStoreModalProps>(TemplatesStoreModal, {
    general,
    isOpened,
    onClose: close,
  });

  return {
    TemplatesStoreModal: isOpened && hasGroups ? Component : NULL_COMPONENT,
    openModal: open,
    closeModal: close,
  };
};
