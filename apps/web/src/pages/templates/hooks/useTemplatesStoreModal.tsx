import { useDisclosure } from '@mantine/hooks';

import { IBlueprintsGrouped } from '../../../api/hooks';
import { useInlineComponent, useIsTemplateStoreEnabled } from '../../../hooks';
import { ITemplatesStoreModalProps, TemplatesStoreModal } from '../components/templates-store';

const NULL_COMPONENT = () => null;

export const useTemplatesStoreModal = ({ general = [] }: { general?: IBlueprintsGrouped[] }) => {
  const [opened, { open, close }] = useDisclosure(false);
  const isTemplateStoreEnabled = useIsTemplateStoreEnabled();
  const hasGroups = general && general.length > 0;
  const isOpened = opened && hasGroups && isTemplateStoreEnabled;

  const Component = useInlineComponent<ITemplatesStoreModalProps>(TemplatesStoreModal, {
    general,
    isOpened,
    onClose: close,
  });

  return {
    TemplatesStoreModal: isOpened ? Component : NULL_COMPONENT,
    openModal: open,
    closeModal: close,
  };
};
