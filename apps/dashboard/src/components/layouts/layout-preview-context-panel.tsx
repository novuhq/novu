import { ISubscriberResponseDto } from '@novu/shared';
import { useCallback } from 'react';

import { Accordion } from '@/components/primitives/accordion';
import { useEnvironment } from '@/context/environment/hooks';
import { useDefaultSubscriberData } from '@/hooks/use-default-subscriber-data';
import { useFetchOrganizationSettings } from '@/hooks/use-fetch-organization-settings';
import { PreviewSubscriberSection } from '../preview-subscriber-section';
import { createSubscriberData } from '../workflow-editor/steps/utils/preview-context.utils';
import { useLayoutEditor } from './layout-editor-provider';
import { clearSubscriberData } from './utils/layout-preview-context-storage';

export const LayoutPreviewContextPanel = () => {
  const {
    layout,
    selectedLocale,
    onLocaleChange,
    accordionValue,
    setAccordionValue,
    updatePreviewSection,
    errors,
    previewContext,
  } = useLayoutEditor();
  const { data: organizationSettings } = useFetchOrganizationSettings();
  const { currentEnvironment } = useEnvironment();
  const createDefaultSubscriberData = useDefaultSubscriberData(undefined, organizationSettings?.data?.defaultLocale);

  const handleSubscriberSelection = useCallback(
    (subscriber: ISubscriberResponseDto) => {
      const subscriberData = createSubscriberData(subscriber);
      updatePreviewSection('subscriber', subscriberData);

      if (subscriber.locale && subscriber.locale !== selectedLocale && onLocaleChange) {
        onLocaleChange(subscriber.locale);
      }
    },
    [updatePreviewSection, onLocaleChange, selectedLocale]
  );

  const handleClearPersistedSubscriber = () => {
    clearSubscriberData(layout?._id || '', currentEnvironment?._id || '');

    updatePreviewSection('subscriber', createDefaultSubscriberData());
  };

  const canClearPersisted = !!(layout?._id && currentEnvironment?._id);

  return (
    <Accordion type="multiple" value={accordionValue} onValueChange={setAccordionValue}>
      <PreviewSubscriberSection
        error={errors.subscriber}
        subscriber={previewContext.subscriber}
        onUpdate={updatePreviewSection}
        onSubscriberSelect={handleSubscriberSelection}
        onClearPersisted={canClearPersisted ? handleClearPersistedSubscriber : undefined}
      />
    </Accordion>
  );
};
