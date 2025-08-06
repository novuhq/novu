import { ISubscriberResponseDto, SubscriberDto } from '@novu/shared';
import { useCallback, useEffect } from 'react';

import { Accordion } from '@/components/primitives/accordion';
import { useEnvironment } from '@/context/environment/hooks';
import { useDefaultSubscriberData } from '@/hooks/use-default-subscriber-data';
import { useFetchOrganizationSettings } from '@/hooks/use-fetch-organization-settings';
import { usePreviewContext } from '@/hooks/use-preview-context';
import { PreviewSubscriberSection } from '../preview-subscriber-section';
import { createSubscriberData } from '../workflow-editor/steps/utils/preview-context.utils';
import { useLayoutEditor } from './layout-editor-provider';
import { clearSubscriberData, loadSubscriberData, saveSubscriberData } from './utils/layout-preview-context-storage';

type ParsedData = { subscriber: Partial<SubscriberDto> };

function parseJsonValue(value: string): ParsedData {
  try {
    const parsed = JSON.parse(value || '{}');
    return {
      subscriber: parsed.subscriber || {},
    };
  } catch {
    return {
      subscriber: {},
    };
  }
}

export const LayoutPreviewContextPanel = () => {
  const { layout, previewContextValue, setPreviewContextValue } = useLayoutEditor();
  const { data: organizationSettings, isLoading: isOrgSettingsLoading } = useFetchOrganizationSettings();
  const { currentEnvironment } = useEnvironment();

  const { accordionValue, setAccordionValue, errors, localParsedData, updateJsonSection } = usePreviewContext({
    value: previewContextValue,
    onChange: setPreviewContextValue,
    defaultAccordionValue: ['subscriber'],
    defaultErrors: {
      subscriber: null,
    },
    parseJsonValue,
    onDataPersist: (data: ParsedData) => {
      if (data.subscriber !== undefined) {
        saveSubscriberData(layout?._id || '', currentEnvironment?._id || '', data.subscriber);
      }
    },
  });

  const createDefaultSubscriberData = useDefaultSubscriberData(undefined, organizationSettings?.data?.defaultLocale);

  // Initialize default subscriber data if none exists (after data initialization)
  useEffect(() => {
    if (!isOrgSettingsLoading && localParsedData.subscriber && Object.keys(localParsedData.subscriber).length === 0) {
      // No subscriber data exists, create default
      const defaultSubscriber = createDefaultSubscriberData();
      updateJsonSection('subscriber', defaultSubscriber);
    }
  }, [isOrgSettingsLoading, localParsedData.subscriber, updateJsonSection, createDefaultSubscriberData]);

  useEffect(() => {
    if (!layout?._id || !currentEnvironment?._id) {
      return;
    }

    const subscriberData = loadSubscriberData(layout?._id, currentEnvironment?._id);

    if (subscriberData) {
      updateJsonSection('subscriber', subscriberData);
    }
  }, [layout?._id, currentEnvironment?._id, updateJsonSection]);

  const handleSubscriberSelection = useCallback(
    (subscriber: ISubscriberResponseDto) => {
      const subscriberData = createSubscriberData(subscriber);
      updateJsonSection('subscriber', subscriberData);
    },
    [updateJsonSection]
  );

  const handleClearPersistedSubscriber = () => {
    clearSubscriberData(layout?._id || '', currentEnvironment?._id || '');

    updateJsonSection('subscriber', createDefaultSubscriberData());
  };

  const canClearPersisted = !!(layout?._id && currentEnvironment?._id);

  return (
    <Accordion type="multiple" value={accordionValue} onValueChange={setAccordionValue}>
      <PreviewSubscriberSection
        error={errors.subscriber}
        subscriber={localParsedData.subscriber}
        onUpdate={updateJsonSection}
        onSubscriberSelect={handleSubscriberSelection}
        onClearPersisted={canClearPersisted ? handleClearPersistedSubscriber : undefined}
      />
    </Accordion>
  );
};
