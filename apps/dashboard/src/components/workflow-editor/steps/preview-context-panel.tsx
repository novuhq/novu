import { Accordion } from '@/components/primitives/accordion';
import { useIsPayloadSchemaEnabled } from '@/hooks/use-is-payload-schema-enabled';
import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment } from '@/context/environment/hooks';
import { getSubscribers } from '@/api/subscribers';
import { createSubscriberData, createSubscriberDataFromUser, parseJsonValue } from './utils/preview-context.utils';
import { PreviewContextPanelProps, ParsedData } from './types/preview-context.types';
import { PreviewPayloadSection, PreviewSubscriberSection, PreviewStepResultsSection } from './components';
import { usePreviewContext } from './hooks/use-preview-context';
import { usePersistedPreviewContext } from './hooks/use-persisted-preview-context';

export function PreviewContextPanel({ workflow, value, onChange, currentStepId }: PreviewContextPanelProps) {
  const { currentUser } = useAuth();
  const { currentEnvironment } = useEnvironment();
  const hasInitializedSubscriberRef = useRef(false);
  const hasLoadedPersistedDataRef = useRef(false);
  const isInitializingRef = useRef(false);

  const isPayloadSchemaEnabled = useIsPayloadSchemaEnabled();

  // Initialize persistence hook
  const { loadPersistedPayload, savePersistedPayload, clearPersistedPayload } = usePersistedPreviewContext({
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
        // Only persist payload data
        if (data.payload) {
          savePersistedPayload(data.payload);
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
      !currentEnvironment?._id
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

        if (persistedPayload) {
          finalData.payload = persistedPayload;
        } else if (isPayloadSchemaEnabled && workflow?.payloadExample) {
          // Apply server defaults for missing payload data
          finalData.payload = workflow.payloadExample;
        }

        // Initialize subscriber data if not present in persisted data
        if (!finalData.subscriber || Object.keys(finalData.subscriber).length === 0) {
          if (currentUser?.email) {
            try {
              const response = await getSubscribers({
                environment: currentEnvironment,
                email: currentUser.email,
                limit: 1,
              });

              if (response.data?.[0]) {
                finalData.subscriber = createSubscriberData(response.data[0]);
              } else {
                finalData.subscriber = createSubscriberDataFromUser(currentUser);
              }
            } catch {
              finalData.subscriber = createSubscriberDataFromUser(currentUser);
            }
          }
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
  }, [workflow?.workflowId, currentStepId, currentEnvironment?._id]);

  const handleClearPersistedData = () => {
    clearPersistedPayload();
    // Reset flags to trigger re-initialization
    hasLoadedPersistedDataRef.current = false;
    hasInitializedSubscriberRef.current = false;
    isInitializingRef.current = false;

    // Reset to initial server values
    const serverDefaults = parseJsonValue('{}');

    if (workflow?.payloadExample && isPayloadSchemaEnabled) {
      serverDefaults.payload = workflow.payloadExample;
    }

    const stringified = JSON.stringify(serverDefaults, null, 2);
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
      />

      <PreviewSubscriberSection
        errors={errors}
        localParsedData={localParsedData}
        workflow={workflow}
        onUpdate={updateJsonSection}
        onSubscriberSelect={handleSubscriberSelection}
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
