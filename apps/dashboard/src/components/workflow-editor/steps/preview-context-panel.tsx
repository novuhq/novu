import { Accordion } from '@/components/primitives/accordion';
import { useIsPayloadSchemaEnabled } from '@/hooks/use-is-payload-schema-enabled';
import { useMemo, useEffect, useCallback } from 'react';
import { useEnvironment } from '@/context/environment/hooks';
import {
  PreviewContextPanelProps,
  ParsedData,
  PreviewSubscriberData,
  PayloadData,
  ValidationErrors,
} from './types/preview-context.types';
import { PreviewPayloadSection, PreviewSubscriberSection, PreviewStepResultsSection } from './components';
import { usePreviewContext } from '../../../hooks/use-preview-context';
import { usePersistedPreviewContext } from './hooks/use-persisted-preview-context';
import { usePreviewDataInitialization } from './hooks/use-preview-data-initialization';
import { StepTypeEnum } from '@/utils/enums';
import { useCreateVariable } from '@/components/variable/hooks/use-create-variable';
import { PayloadSchemaDrawer } from '../payload-schema-drawer';
import { DEFAULT_LOCALE, ISubscriberResponseDto } from '@novu/shared';
import { createSubscriberData, parseJsonValue } from './utils/preview-context.utils';
import { DEFAULT_ACCORDION_VALUES } from './constants/preview-context.constants';

const createDefaultSubscriberData = (locale: string = DEFAULT_LOCALE): PreviewSubscriberData => ({
  subscriberId: '123456',
  firstName: 'John',
  lastName: 'Doe',
  email: 'user@example.com',
  phone: '+1234567890',
  avatar: 'https://example.com/avatar.png',
  locale,
});

export function PreviewContextPanel({
  workflow,
  value,
  onChange,
  currentStepId,
  selectedLocale,
  onLocaleChange,
}: PreviewContextPanelProps) {
  const { currentEnvironment } = useEnvironment();
  const isPayloadSchemaEnabled = useIsPayloadSchemaEnabled();
  const { isPayloadSchemaDrawerOpen, highlightedVariableKey, openSchemaDrawer, closeSchemaDrawer } =
    useCreateVariable();

  const hasDigestStep = useMemo(() => {
    return workflow?.steps?.some((step) => step.type === StepTypeEnum.DIGEST) ?? false;
  }, [workflow?.steps]);

  const {
    loadPersistedPayload,
    savePersistedPayload,
    clearPersistedPayload,
    loadPersistedSubscriber,
    savePersistedSubscriber,
    clearPersistedSubscriber,
  } = usePersistedPreviewContext({
    workflowId: workflow?.workflowId || '',
    stepId: currentStepId || '',
    environmentId: currentEnvironment?._id || '',
  });

  // Use the preview context hook with persistence callback
  const { accordionValue, setAccordionValue, errors, localParsedData, updateJsonSection } = usePreviewContext<
    ParsedData,
    ValidationErrors
  >({
    value,
    onChange,
    defaultAccordionValue: DEFAULT_ACCORDION_VALUES,
    defaultErrors: {
      subscriber: null,
      payload: null,
      steps: null,
    },
    parseJsonValue,
    onDataPersist: (data: ParsedData) => {
      // Persist both payload and subscriber data
      if (data.payload !== undefined) {
        savePersistedPayload(data.payload);
      }

      if (data.subscriber !== undefined) {
        savePersistedSubscriber(data.subscriber);
      }
    },
  });

  const handleSubscriberSelection = useCallback(
    (subscriber: ISubscriberResponseDto) => {
      const subscriberData = createSubscriberData(subscriber);
      updateJsonSection('subscriber', subscriberData);
    },
    [updateJsonSection]
  );

  // Initialize data using the new simplified hook
  usePreviewDataInitialization({
    workflowId: workflow?.workflowId,
    stepId: currentStepId,
    environmentId: currentEnvironment?._id,
    value,
    onChange,
    workflow,
    isPayloadSchemaEnabled,
    loadPersistedPayload,
    loadPersistedSubscriber,
  });

  // Sync subscriber locale with selected locale
  useEffect(() => {
    if (selectedLocale && localParsedData.subscriber.locale !== selectedLocale) {
      updateJsonSection('subscriber', {
        ...localParsedData.subscriber,
        locale: selectedLocale,
      });
    }
  }, [selectedLocale, localParsedData.subscriber, updateJsonSection]);

  // Sync selected locale with subscriber locale when subscriber locale changes
  useEffect(() => {
    if (localParsedData.subscriber.locale && localParsedData.subscriber.locale !== selectedLocale && onLocaleChange) {
      onLocaleChange(localParsedData.subscriber.locale);
    }
  }, [localParsedData.subscriber.locale, selectedLocale, onLocaleChange]);

  const handleClearPersistedPayload = () => {
    clearPersistedPayload();

    // Reset payload to server defaults if available
    const newPayload: PayloadData =
      workflow?.payloadExample && isPayloadSchemaEnabled ? (workflow.payloadExample as PayloadData) : {};

    updateJsonSection('payload', newPayload);
  };

  const handleClearPersistedSubscriber = () => {
    clearPersistedSubscriber();

    updateJsonSection('subscriber', createDefaultSubscriberData(selectedLocale));
  };

  const canClearPersisted = !!(workflow?.workflowId && currentStepId && currentEnvironment?._id);

  return (
    <>
      <Accordion type="multiple" value={accordionValue} onValueChange={setAccordionValue}>
        <PreviewPayloadSection
          errors={errors}
          localParsedData={localParsedData}
          workflow={workflow}
          onUpdate={updateJsonSection}
          onClearPersisted={canClearPersisted ? handleClearPersistedPayload : undefined}
          hasDigestStep={hasDigestStep}
          onManageSchema={openSchemaDrawer}
        />

        <PreviewSubscriberSection
          error={errors.subscriber}
          subscriber={localParsedData.subscriber}
          workflow={workflow}
          onUpdate={updateJsonSection}
          onSubscriberSelect={handleSubscriberSelection}
          onClearPersisted={canClearPersisted ? handleClearPersistedSubscriber : undefined}
        />

        <PreviewStepResultsSection
          errors={errors}
          localParsedData={localParsedData}
          workflow={workflow}
          onUpdate={updateJsonSection}
          currentStepId={currentStepId}
        />
      </Accordion>
      <PayloadSchemaDrawer
        isOpen={isPayloadSchemaDrawerOpen}
        onOpenChange={(isOpen: boolean) => {
          if (!isOpen) {
            closeSchemaDrawer();
          }
        }}
        workflow={workflow}
        highlightedPropertyKey={highlightedVariableKey}
        onSave={() => {
          // TODO: maybe refetch workflow
        }}
      />
    </>
  );
}
