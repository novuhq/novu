import { ISubscriberResponseDto } from '@novu/shared';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Accordion } from '@/components/primitives/accordion';
import { useCreateVariable } from '@/components/variable/hooks/use-create-variable';
import { useEnvironment } from '@/context/environment/hooks';
import { useDefaultSubscriberData } from '@/hooks/use-default-subscriber-data';
import { useFetchOrganizationSettings } from '@/hooks/use-fetch-organization-settings';
import { useIsPayloadSchemaEnabled } from '@/hooks/use-is-payload-schema-enabled';
import { StepTypeEnum } from '@/utils/enums';
import { usePreviewContext } from '../../../hooks/use-preview-context';
import { PayloadSchemaDrawer } from '../payload-schema-drawer';
import { PreviewPayloadSection, PreviewStepResultsSection, PreviewSubscriberSection } from './components';
import { DEFAULT_ACCORDION_VALUES } from './constants/preview-context.constants';
import { usePersistedPreviewContext } from './hooks/use-persisted-preview-context';
import { usePreviewDataInitialization } from './hooks/use-preview-data-initialization';
import {
  ParsedData,
  PayloadData,
  PreviewContextPanelProps,
  PreviewSubscriberData,
  ValidationErrors,
} from './types/preview-context.types';
import { createSubscriberData, parseJsonValue } from './utils/preview-context.utils';

function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

function useLocaleSynchronization({
  selectedLocale,
  subscriberLocale,
  isOrgSettingsLoading,
  hasSubscriberData,
  updateJsonSection,
  onLocaleChange,
  localParsedData,
}: {
  selectedLocale?: string;
  subscriberLocale?: string;
  isOrgSettingsLoading: boolean;
  hasSubscriberData: boolean;
  updateJsonSection: (section: 'subscriber', data: PreviewSubscriberData) => void;
  onLocaleChange?: (locale: string) => void;
  localParsedData: ParsedData;
}) {
  const prevSelectedLocale = usePrevious(selectedLocale);
  const prevSubscriberLocale = usePrevious(subscriberLocale);

  useEffect(() => {
    if (isOrgSettingsLoading || !selectedLocale || !hasSubscriberData) {
      return;
    }

    const selectedLocaleChanged = selectedLocale !== prevSelectedLocale;
    const subscriberLocaleChanged = subscriberLocale !== prevSubscriberLocale;

    if (selectedLocaleChanged && selectedLocale !== subscriberLocale) {
      updateJsonSection('subscriber', {
        ...localParsedData.subscriber,
        locale: selectedLocale,
      });
    } else if (subscriberLocaleChanged && subscriberLocale && subscriberLocale !== selectedLocale && onLocaleChange) {
      onLocaleChange(subscriberLocale);
    }
  }, [
    selectedLocale,
    subscriberLocale,
    prevSelectedLocale,
    prevSubscriberLocale,
    isOrgSettingsLoading,
    hasSubscriberData,
    updateJsonSection,
    onLocaleChange,
    localParsedData.subscriber,
  ]);
}

export function PreviewContextPanel({
  workflow,
  value,
  onChange,
  currentStepId,
  selectedLocale,
  onLocaleChange,
}: PreviewContextPanelProps) {
  const { currentEnvironment } = useEnvironment();
  const { data: organizationSettings, isLoading: isOrgSettingsLoading } = useFetchOrganizationSettings();
  const isPayloadSchemaEnabled = useIsPayloadSchemaEnabled();
  const { isPayloadSchemaDrawerOpen, highlightedVariableKey, openSchemaDrawer, closeSchemaDrawer } =
    useCreateVariable();

  const hasDigestStep = useMemo(() => {
    return workflow?.steps?.some((step) => step.type === StepTypeEnum.DIGEST) ?? false;
  }, [workflow?.steps]);

  const createDefaultSubscriberData = useDefaultSubscriberData(
    selectedLocale,
    organizationSettings?.data?.defaultLocale
  );

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

  // Initialize default subscriber data if none exists (after data initialization)
  useEffect(() => {
    if (!isOrgSettingsLoading && localParsedData.subscriber && Object.keys(localParsedData.subscriber).length === 0) {
      // No subscriber data exists, create default
      const defaultSubscriber = createDefaultSubscriberData();
      updateJsonSection('subscriber', defaultSubscriber);
    }
  }, [isOrgSettingsLoading, localParsedData.subscriber, updateJsonSection, createDefaultSubscriberData]);

  // Smart two-way locale synchronization
  useLocaleSynchronization({
    selectedLocale,
    subscriberLocale: localParsedData.subscriber?.locale,
    isOrgSettingsLoading,
    hasSubscriberData: Object.keys(localParsedData.subscriber || {}).length > 0,
    updateJsonSection,
    onLocaleChange,
    localParsedData,
  });

  const handleSubscriberSelection = useCallback(
    (subscriber: ISubscriberResponseDto) => {
      const subscriberData = createSubscriberData(subscriber);
      updateJsonSection('subscriber', subscriberData);

      // If the selected subscriber has a different locale, update the selected locale
      if (subscriber.locale && subscriber.locale !== selectedLocale && onLocaleChange) {
        onLocaleChange(subscriber.locale);
      }
    },
    [updateJsonSection, selectedLocale, onLocaleChange]
  );

  const handleClearPersistedPayload = () => {
    clearPersistedPayload();

    // Reset payload to server defaults if available
    const newPayload: PayloadData =
      workflow?.payloadExample && isPayloadSchemaEnabled ? (workflow.payloadExample as PayloadData) : {};

    updateJsonSection('payload', newPayload);
  };

  const handleClearPersistedSubscriber = () => {
    clearPersistedSubscriber();
    updateJsonSection('subscriber', createDefaultSubscriberData());
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
