import { useCallback, useEffect } from 'react';
import { ISubscriberResponseDto, SubscriberDto } from '@novu/shared';

import { Accordion } from '@/components/primitives/accordion';
import { PreviewSubscriberSection } from '../preview-subscriber-section';
import { usePreviewContext } from '@/hooks/use-preview-context';
import { clearSubscriberData, loadSubscriberData, saveSubscriberData } from './utils/layout-preview-context-storage';
import { useLayoutEditor } from './layout-editor-provider';
import { useEnvironment } from '@/context/environment/hooks';
import { createSubscriberData } from '../workflow-editor/steps/utils/preview-context.utils';

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

    updateJsonSection('subscriber', {});
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
