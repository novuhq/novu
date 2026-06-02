import { ISubscriberResponseDto } from '@novu/shared';
import { JSONSchema7 } from 'json-schema';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Accordion } from '@/components/primitives/accordion';
import { useCreateVariable } from '@/components/variable/hooks/use-create-variable';
import { useEnvironment } from '@/context/environment/hooks';
import { useDefaultSubscriberData } from '@/hooks/use-default-subscriber-data';
import { useDynamicPreviewSchema } from '@/hooks/use-dynamic-preview-schema';
import { useFetchOrganizationSettings } from '@/hooks/use-fetch-organization-settings';
import { useIsPayloadSchemaEnabled } from '@/hooks/use-is-payload-schema-enabled';
import { StepTypeEnum } from '@/utils/enums';
import { usePreviewContext } from '../../../hooks/use-preview-context';
import { PayloadSchemaDrawer } from '../payload-schema-drawer';
import {
  PreviewContextSection,
  PreviewEnvSection,
  PreviewPayloadSection,
  PreviewStepResultsSection,
  PreviewSubscriberSection,
} from './components';
import { ACCORDION_STYLES, DEFAULT_ACCORDION_VALUES } from './constants/preview-context.constants';
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
  const ref = useRef<T | undefined>(undefined);
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
  updatePreviewSection,
  onLocaleChange,
  previewContext,
}: {
  selectedLocale?: string;
  subscriberLocale?: string;
  isOrgSettingsLoading: boolean;
  hasSubscriberData: boolean;
  updatePreviewSection: (section: 'subscriber', data: PreviewSubscriberData) => void;
  onLocaleChange?: (locale: string) => void;
  previewContext: ParsedData;
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
      updatePreviewSection('subscriber', {
        ...previewContext.subscriber,
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
    updatePreviewSection,
    onLocaleChange,
    previewContext.subscriber,
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

  const previewSchema = useDynamicPreviewSchema();
  const schemas = useMemo(
    () => ({
      payload: workflow?.payloadSchema,
      subscriber: previewSchema?.properties?.subscriber as JSONSchema7 | undefined,
      context: previewSchema?.properties?.context as JSONSchema7 | undefined,
      steps: previewSchema?.properties?.steps as JSONSchema7 | undefined,
      env: previewSchema?.properties?.env as JSONSchema7 | undefined,
    }),
    [previewSchema, workflow?.payloadSchema]
  );

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
    loadPersistedContext,
    savePersistedContext,
    clearPersistedContext,
  } = usePersistedPreviewContext({
    workflowId: workflow?.workflowId || '',
    environmentId: currentEnvironment?._id || '',
  });

  // Use the preview context hook with persistence callback
  const { accordionValue, setAccordionValue, errors, previewContext, updatePreviewSection, trackedOnChange } =
    usePreviewContext<ParsedData, ValidationErrors>({
      value,
      onChange,
      defaultAccordionValue: DEFAULT_ACCORDION_VALUES,
      defaultErrors: {
        subscriber: null,
        payload: null,
        steps: null,
        context: null,
        env: null,
      },
      parseJsonValue,
      onDataPersist: (data: ParsedData) => {
        if (data.payload !== undefined) {
          savePersistedPayload(data.payload);
        }

        if (data.subscriber !== undefined) {
          savePersistedSubscriber(data.subscriber);
        }

        if (data.context !== undefined) {
          savePersistedContext(data.context);
        }
      },
    });

  // Initialize data using the new simplified hook.
  // trackedOnChange keeps a synchronous ref of the latest value so that
  // subsequent updatePreviewSection calls in the same render cycle
  // (e.g. the subscriber-default effect) read fresh data instead of stale props.
  usePreviewDataInitialization({
    workflowId: workflow?.workflowId,
    stepId: currentStepId,
    environmentId: currentEnvironment?._id,
    value,
    onChange: trackedOnChange,
    workflow,
    isPayloadSchemaEnabled,
    loadPersistedPayload,
    loadPersistedSubscriber,
    loadPersistedContext,
  });

  // Initialize default subscriber data if none exists (after data initialization)
  useEffect(() => {
    if (!isOrgSettingsLoading && previewContext.subscriber && Object.keys(previewContext.subscriber).length === 0) {
      // Check if persisted data exists in localStorage before creating defaults
      const persistedSubscriber = loadPersistedSubscriber();
      if (!persistedSubscriber || Object.keys(persistedSubscriber).length === 0) {
        // No persisted data exists, create default
        const defaultSubscriber = createDefaultSubscriberData();
        updatePreviewSection('subscriber', defaultSubscriber);
      }
    }
  }, [
    isOrgSettingsLoading,
    previewContext.subscriber,
    updatePreviewSection,
    createDefaultSubscriberData,
    loadPersistedSubscriber,
  ]);

  // Smart two-way locale synchronization
  useLocaleSynchronization({
    selectedLocale,
    subscriberLocale: previewContext.subscriber?.locale,
    isOrgSettingsLoading,
    hasSubscriberData: Object.keys(previewContext.subscriber || {}).length > 0,
    updatePreviewSection,
    onLocaleChange,
    previewContext,
  });

  const handleSubscriberSelection = useCallback(
    (subscriber: ISubscriberResponseDto) => {
      const subscriberData = createSubscriberData(subscriber);
      updatePreviewSection('subscriber', subscriberData);

      // If the selected subscriber has a different locale, update the selected locale
      if (subscriber.locale && subscriber.locale !== selectedLocale && onLocaleChange) {
        onLocaleChange(subscriber.locale);
      }
    },
    [updatePreviewSection, selectedLocale, onLocaleChange]
  );

  const handleClearPersistedPayload = useCallback(() => {
    clearPersistedPayload();

    const newPayload: PayloadData =
      workflow?.payloadExample && isPayloadSchemaEnabled ? (workflow.payloadExample as PayloadData) : {};

    updatePreviewSection('payload', newPayload);
  }, [clearPersistedPayload, workflow?.payloadExample, isPayloadSchemaEnabled, updatePreviewSection]);

  const handleClearPersistedSubscriber = useCallback(() => {
    clearPersistedSubscriber();
    updatePreviewSection('subscriber', createDefaultSubscriberData());
  }, [clearPersistedSubscriber, updatePreviewSection, createDefaultSubscriberData]);

  const handleClearPersistedContext = useCallback(() => {
    clearPersistedContext();
    updatePreviewSection('context', null);
  }, [clearPersistedContext, updatePreviewSection]);

  const canClearPersisted = !!(workflow?.workflowId && currentStepId && currentEnvironment?._id);

  return (
    <>
      <Accordion type="multiple" value={accordionValue} onValueChange={setAccordionValue}>
        <PreviewPayloadSection
          errors={errors}
          localParsedData={previewContext}
          workflow={workflow}
          onUpdate={updatePreviewSection}
          schema={schemas.payload}
          onClearPersisted={canClearPersisted ? handleClearPersistedPayload : undefined}
          hasDigestStep={hasDigestStep}
          onManageSchema={openSchemaDrawer}
        />

        <PreviewSubscriberSection
          error={errors.subscriber}
          subscriber={previewContext.subscriber}
          workflow={workflow}
          onUpdate={updatePreviewSection}
          schema={schemas.subscriber}
          onSubscriberSelect={handleSubscriberSelection}
          onClearPersisted={canClearPersisted ? handleClearPersistedSubscriber : undefined}
        />

        <PreviewStepResultsSection
          errors={errors}
          localParsedData={previewContext}
          workflow={workflow}
          onUpdate={updatePreviewSection}
          currentStepId={currentStepId}
        />

        <PreviewContextSection
          error={errors.context}
          context={previewContext.context}
          schema={schemas.context}
          onUpdate={updatePreviewSection}
          onClearPersisted={canClearPersisted ? handleClearPersistedContext : undefined}
          className={ACCORDION_STYLES.item}
        />

        <PreviewEnvSection schema={schemas.env} env={previewContext.env} onUpdate={updatePreviewSection} />
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
