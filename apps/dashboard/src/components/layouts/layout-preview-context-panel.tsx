import { ISubscriberResponseDto } from '@novu/shared';
import { JSONSchema7 } from 'json-schema';
import { useCallback, useMemo } from 'react';

import { Accordion } from '@/components/primitives/accordion';
import { useEnvironment } from '@/context/environment/hooks';
import { useDefaultSubscriberData } from '@/hooks/use-default-subscriber-data';
import { useDynamicPreviewSchema } from '@/hooks/use-dynamic-preview-schema';
import { useFetchOrganizationSettings } from '@/hooks/use-fetch-organization-settings';
import { PreviewContextSection } from '../preview-context-section';
import { PreviewEnvSection } from '../preview-env-section';
import { PreviewSubscriberSection } from '../preview-subscriber-section';
import { ACCORDION_STYLES } from '../workflow-editor/steps/constants/preview-context.constants';
import { createSubscriberData } from '../workflow-editor/steps/utils/preview-context.utils';
import { useLayoutEditor } from './layout-editor-provider';

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
    clearPersistedSubscriber,
    clearPersistedContext,
  } = useLayoutEditor();
  const { data: organizationSettings } = useFetchOrganizationSettings();
  const { currentEnvironment } = useEnvironment();
  const createDefaultSubscriberData = useDefaultSubscriberData(undefined, organizationSettings?.data?.defaultLocale);
  const previewSchema = useDynamicPreviewSchema(true);
  const envSchema = useMemo(() => previewSchema?.properties?.env as JSONSchema7 | undefined, [previewSchema]);

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
    clearPersistedSubscriber();

    updatePreviewSection('subscriber', createDefaultSubscriberData());
  };

  const handleClearPersistedContext = () => {
    clearPersistedContext();

    updatePreviewSection('context', {});
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

      <PreviewContextSection
        error={errors.context}
        context={previewContext.context}
        onUpdate={updatePreviewSection}
        onClearPersisted={canClearPersisted ? handleClearPersistedContext : undefined}
        className={ACCORDION_STYLES.item}
      />

      <PreviewEnvSection schema={envSchema} env={previewContext.env ?? {}} onUpdate={updatePreviewSection} />
    </Accordion>
  );
};
