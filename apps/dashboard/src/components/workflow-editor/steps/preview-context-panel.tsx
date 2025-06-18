import { Accordion } from '@/components/primitives/accordion';
import { useIsPayloadSchemaEnabled } from '@/hooks/use-is-payload-schema-enabled';
import { useMemo } from 'react';
import { useEnvironment } from '@/context/environment/hooks';
import {
  PreviewContextPanelProps,
  ParsedData,
  PreviewSubscriberData,
  PayloadData,
  PayloadSectionProps,
} from './types/preview-context.types';
import { PreviewPayloadSection, PreviewSubscriberSection, PreviewStepResultsSection } from './components';
import { usePreviewContext } from './hooks/use-preview-context';
import { usePersistedPreviewContext } from './hooks/use-persisted-preview-context';
import { usePreviewDataInitialization } from './hooks/use-preview-data-initialization';
import { StepTypeEnum } from '@/utils/enums';
import { useCreateVariable } from '@/components/variable/hooks/use-create-variable';
import { PayloadSchemaDrawer } from '../payload-schema-drawer';

const DEFAULT_SUBSCRIBER_DATA: PreviewSubscriberData = {
  subscriberId: '123456',
  firstName: 'John',
  lastName: 'Doe',
  email: 'user@example.com',
  phone: '+1234567890',
  avatar: 'https://example.com/avatar.png',
  locale: 'en-US',
};

export function PreviewContextPanel({ workflow, value, onChange, currentStepId }: PreviewContextPanelProps) {
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

  const handleClearPersistedPayload = () => {
    clearPersistedPayload();

    // Reset payload to server defaults if available
    const newPayload: PayloadData =
      workflow?.payloadExample && isPayloadSchemaEnabled ? (workflow.payloadExample as PayloadData) : {};

    updateJsonSection('payload', newPayload);
  };

  const handleClearPersistedSubscriber = () => {
    clearPersistedSubscriber();

    updateJsonSection('subscriber', DEFAULT_SUBSCRIBER_DATA);
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
          errors={errors}
          localParsedData={localParsedData}
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
