import { useDisclosure } from '@mantine/hooks';
import { FeatureFlagsKeysEnum } from '@novu/shared';

import { IBlueprintsGrouped } from '../../../api/hooks';
import { useInlineComponent, useFeatureFlag } from '../../../hooks';
import { ITemplatesStoreModalProps, TemplatesStoreModal } from '../components/templates-store';

const NULL_COMPONENT = () => null;

export const useTemplatesStoreModal = ({
  general = [],
  popular,
}: {
  general?: IBlueprintsGrouped[];
  popular?: IBlueprintsGrouped;
}) => {
  const [opened, { open, close }] = useDisclosure(false);
  const isTemplateStoreEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_TEMPLATE_STORE_ENABLED);
  const hasGroups = general && general.length > 0;
  const hasPopular = !!(popular && popular?.blueprints.length > 0);
  const hasGroupsOrPopular = hasGroups || hasPopular;
  const isOpened = opened && hasGroupsOrPopular && isTemplateStoreEnabled;

  const Component = useInlineComponent<ITemplatesStoreModalProps>(TemplatesStoreModal, {
    general,
    popular: popular ? [popular] : [],
    isOpened,
    onClose: close,
  });

  return {
    TemplatesStoreModal: isOpened ? Component : NULL_COMPONENT,
    openModal: open,
    closeModal: close,
  };
};
