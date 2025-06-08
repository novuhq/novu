import { Accordion } from '@/components/primitives/accordion';
import { useIsPayloadSchemaEnabled } from '@/hooks/use-is-payload-schema-enabled';
import { useEffect } from 'react';
import { PreviewContextPanelProps } from './types/preview-context.types';
import { PreviewPayloadSection, PreviewSubscriberSection, PreviewStepResultsSection } from './components';
import { usePreviewContext } from './hooks/use-preview-context';
import { useSubscriberInitialization } from './hooks/use-subscriber-initialization';

export function PreviewContextPanel({ workflow, value, onChange, currentStepId }: PreviewContextPanelProps) {
  const { accordionValue, setAccordionValue, errors, localParsedData, updateJsonSection, handleSubscriberSelection } =
    usePreviewContext(value, onChange);

  const isPayloadSchemaEnabled = useIsPayloadSchemaEnabled();

  // Initialize payload with schema example if available
  useEffect(() => {
    if (isPayloadSchemaEnabled && workflow?.payloadExample && !localParsedData.payload) {
      updateJsonSection('payload', workflow.payloadExample);
    }
  }, [isPayloadSchemaEnabled, workflow?.payloadExample, localParsedData.payload, updateJsonSection]);

  // Auto-load current user's subscriber data (disabled by default)
  useSubscriberInitialization(localParsedData, updateJsonSection, false);

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
