import { Accordion } from '@/components/primitives/accordion';
import { useIsPayloadSchemaEnabled } from '@/hooks/use-is-payload-schema-enabled';
import { useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment } from '@/context/environment/hooks';
import { getSubscribers } from '@/api/subscribers';
import { createSubscriberData, createSubscriberDataFromUser, parseJsonValue } from './utils/preview-context.utils';
import { mergePreviewContextData } from './utils/preview-context-storage.utils';
import { PreviewContextPanelProps, ParsedData } from './types/preview-context.types';
import { PreviewPayloadSection, PreviewSubscriberSection, PreviewStepResultsSection } from './components';
import { usePreviewContext } from './hooks/use-preview-context';
import { usePersistedPreviewContext } from './hooks/use-persisted-preview-context';
import { StepTypeEnum } from '@/utils/enums';

export function PreviewContextPanel({ workflow, value, onChange, currentStepId }: PreviewContextPanelProps) {
  const { currentEnvironment } = useEnvironment();
  const hasInitializedSubscriberRef = useRef(false);
  const hasLoadedPersistedDataRef = useRef(false);
  const isInitializingRef = useRef(false);

  const isPayloadSchemaEnabled = useIsPayloadSchemaEnabled();

  // Check if workflow has digest steps
  const hasDigestStep = useMemo(() => {
    return workflow?.steps?.some((step) => step.type === StepTypeEnum.DIGEST) ?? false;
  }, [workflow?.steps]);

  // Initialize persistence hook
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

  const { accordionValue, setAccordionValue, errors, localParsedData, updateJsonSection, handleSubscriberSelection } =
    usePreviewContext(value, onChange, {
      workflowId: workflow?.workflowId,
      stepId: currentStepId,
      environmentId: currentEnvironment?._id,
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

  // Load persisted data and initialize defaults on mount
  useEffect(() => {
    if (
      hasLoadedPersistedDataRef.current ||
      isInitializingRef.current ||
      !workflow?.workflowId ||
      !currentStepId ||
      !currentEnvironment?._id ||
      !value ||
      value === '{}'
    ) {
      return;
    }

    hasLoadedPersistedDataRef.current = true;
    isInitializingRef.current = true;

    const initializeData = async () => {
      try {
        // Start with current data
        const currentData = parseJsonValue(value);
        const finalData = { ...currentData };

        // Load persisted payload data if available
        const persistedPayload = loadPersistedPayload();

        if (persistedPayload && isPayloadSchemaEnabled && workflow?.payloadExample) {
          // Merge persisted payload with server defaults, only keeping fields that exist in server defaults
          const mergedData = mergePreviewContextData(
            { payload: persistedPayload, subscriber: {}, steps: {} },
            { payload: workflow.payloadExample, subscriber: {}, steps: {} }
          );
          finalData.payload = mergedData.payload;
        } else if (persistedPayload) {
          finalData.payload = persistedPayload;
        } else if (isPayloadSchemaEnabled && workflow?.payloadExample) {
          // Apply server defaults for missing payload data
          finalData.payload = workflow.payloadExample;
        }

        // Load persisted subscriber data if available
        const persistedSubscriber = loadPersistedSubscriber();

        if (persistedSubscriber) {
          finalData.subscriber = persistedSubscriber;
        }

        // Update if there are changes
        const hasChanges = JSON.stringify(finalData) !== JSON.stringify(currentData);

        if (hasChanges) {
          const stringified = JSON.stringify(finalData, null, 2);
          onChange(stringified);
        }

        hasInitializedSubscriberRef.current = true;
      } finally {
        isInitializingRef.current = false;
      }
    };

    initializeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflow?.workflowId, currentStepId, currentEnvironment?._id, value]);

  // Handle server data updates after initial load
  useEffect(() => {
    if (
      !hasLoadedPersistedDataRef.current ||
      isInitializingRef.current ||
      !workflow?.workflowId ||
      !currentStepId ||
      !currentEnvironment?._id ||
      !value ||
      value === '{}'
    ) {
      return;
    }

    const handleServerUpdate = async () => {
      try {
        const currentData = parseJsonValue(value);
        const persistedSubscriber = loadPersistedSubscriber();

        // If we have persisted subscriber data but current data doesn't have it, merge it in
        if (persistedSubscriber && (!currentData.subscriber || Object.keys(currentData.subscriber).length === 0)) {
          const finalData = { ...currentData, subscriber: persistedSubscriber };
          const stringified = JSON.stringify(finalData, null, 2);
          onChange(stringified);
        }
      } catch (error) {
        console.warn('Failed to merge persisted subscriber data:', error);
      }
    };

    handleServerUpdate();
  }, [value, workflow?.workflowId, currentStepId, currentEnvironment?._id, loadPersistedSubscriber, onChange]);

  const handleClearPersistedData = () => {
    // Only clear persisted payload data, keep subscriber data
    clearPersistedPayload();

    // Get current data to preserve subscriber and step results
    const currentData = parseJsonValue(value);
    const finalData = { ...currentData };

    // Reset only the payload to defaults
    if (workflow?.payloadExample && isPayloadSchemaEnabled) {
      finalData.payload = workflow.payloadExample;
    } else {
      finalData.payload = {};
    }

    const stringified = JSON.stringify(finalData, null, 2);
    onChange(stringified);
  };

  const handleClearPersistedSubscriber = () => {
    // Only clear persisted subscriber data, keep payload and step results
    clearPersistedSubscriber();

    // Get current data to preserve payload and step results
    const currentData = parseJsonValue(value);
    const finalData = { ...currentData };

    // Reset subscriber to server's default mock subscriber data
    finalData.subscriber = {
      subscriberId: '123456',
      firstName: 'John',
      lastName: 'Doe',
      email: 'user@example.com',
      phone: '+1234567890',
      avatar: 'https://example.com/avatar.png',
      locale: 'en-US',
      data: {},
    };

    const stringified = JSON.stringify(finalData, null, 2);
    onChange(stringified);
  };

  return (
    <Accordion type="multiple" value={accordionValue} onValueChange={setAccordionValue}>
      <PreviewPayloadSection
        errors={errors}
        localParsedData={localParsedData}
        workflow={workflow}
        onUpdate={updateJsonSection}
        onClearPersisted={
          workflow?.workflowId && currentStepId && currentEnvironment?._id ? handleClearPersistedData : undefined
        }
        hasDigestStep={hasDigestStep}
      />

      <PreviewSubscriberSection
        errors={errors}
        localParsedData={localParsedData}
        workflow={workflow}
        onUpdate={updateJsonSection}
        onSubscriberSelect={handleSubscriberSelection}
        onClearPersisted={
          workflow?.workflowId && currentStepId && currentEnvironment?._id ? handleClearPersistedSubscriber : undefined
        }
      />

      <PreviewStepResultsSection
        errors={errors}
        localParsedData={localParsedData}
        workflow={workflow}
        onUpdate={updateJsonSection}
        currentStepId={currentStepId}
      />
    </Accordion>
  );
}
