import { Accordion } from '@/components/primitives/accordion';
import { useIsPayloadSchemaEnabled } from '@/hooks/use-is-payload-schema-enabled';
import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment } from '@/context/environment/hooks';
import { getSubscribers } from '@/api/subscribers';
import { createSubscriberData, createSubscriberDataFromUser, parseJsonValue } from './utils/preview-context.utils';
import { PreviewContextPanelProps } from './types/preview-context.types';
import { PreviewPayloadSection, PreviewSubscriberSection, PreviewStepResultsSection } from './components';
import { usePreviewContext } from './hooks/use-preview-context';

export function PreviewContextPanel({ workflow, value, onChange, currentStepId }: PreviewContextPanelProps) {
  const { accordionValue, setAccordionValue, errors, localParsedData, updateJsonSection, handleSubscriberSelection } =
    usePreviewContext(value, onChange);

  const { currentUser } = useAuth();
  const { currentEnvironment } = useEnvironment();
  const hasInitializedSubscriberRef = useRef(false);
  const initialValueRef = useRef(value);

  const isPayloadSchemaEnabled = useIsPayloadSchemaEnabled();

  // Initialize payload with schema example if available
  useEffect(() => {
    if (isPayloadSchemaEnabled && workflow?.payloadExample && !localParsedData.payload) {
      updateJsonSection('payload', workflow.payloadExample);
    }
  }, [isPayloadSchemaEnabled, workflow?.payloadExample, localParsedData.payload, updateJsonSection]);

  // Initialize subscriber with current user data (only once on mount)
  useEffect(() => {
    if (hasInitializedSubscriberRef.current || !currentUser?.email || !currentEnvironment) {
      return;
    }

    // Check if subscriber data already exists in the initial value
    const initialData = parseJsonValue(initialValueRef.current);

    if (initialData.subscriber && Object.keys(initialData.subscriber).length > 0) {
      hasInitializedSubscriberRef.current = true;
      return;
    }

    const initializeSubscriber = async () => {
      // Mark as initialized immediately to prevent re-runs
      hasInitializedSubscriberRef.current = true;

      try {
        const response = await getSubscribers({
          environment: currentEnvironment,
          email: currentUser.email!,
          limit: 1,
        });

        if (response.data?.[0]) {
          // Use existing subscriber if found
          const subscriberData = createSubscriberData(response.data[0]);
          updateJsonSection('subscriber', subscriberData);
        } else {
          // Fall back to creating subscriber data from current user
          const subscriberData = createSubscriberDataFromUser(currentUser);
          updateJsonSection('subscriber', subscriberData);
        }
      } catch {
        // Fall back to creating subscriber data from current user on API error
        const subscriberData = createSubscriberDataFromUser(currentUser);
        updateJsonSection('subscriber', subscriberData);
      }
    };

    initializeSubscriber();
  }, []);

  return (
    <Accordion type="multiple" value={accordionValue} onValueChange={setAccordionValue}>
      <PreviewPayloadSection
        errors={errors}
        localParsedData={localParsedData}
        workflow={workflow}
        onUpdate={updateJsonSection}
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
