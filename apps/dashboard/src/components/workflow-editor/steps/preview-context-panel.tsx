import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/primitives/accordion';
import { Button } from '@/components/primitives/button';
import { useIsPayloadSchemaEnabled } from '@/hooks/use-is-payload-schema-enabled';
import { WorkflowResponseDto, StepTypeEnum } from '@novu/shared';
import { useCallback, useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import {
  RiRefreshLine,
  RiMailLine,
  RiSmartphoneLine,
  RiNotificationLine,
  RiChat1Line,
  RiCodeLine,
  RiContractUpDownLine,
  RiExpandUpDownLine,
} from 'react-icons/ri';
import { EditableJsonViewer } from './shared/editable-json-viewer/editable-json-viewer';

type PreviewContextPanelProps = {
  workflow?: WorkflowResponseDto;
  value: string;
  onChange: (value: string) => Error | null;
  subscriberData?: Record<string, any>;
  currentStepId?: string;
};

// Get step name from workflow
const getStepName = (workflow?: WorkflowResponseDto, stepId?: string) => {
  const step = workflow?.steps?.find((s) => s.stepId === stepId);
  return step?.name || stepId || 'Unknown Step';
};

// Get step type from workflow
const getStepType = (workflow?: WorkflowResponseDto, stepId?: string) => {
  const step = workflow?.steps?.find((s) => s.stepId === stepId);
  return step?.type;
};

// Get step type icon
const getStepTypeIcon = (stepType?: StepTypeEnum) => {
  switch (stepType) {
    case StepTypeEnum.EMAIL:
      return RiMailLine;
    case StepTypeEnum.SMS:
      return RiSmartphoneLine;
    case StepTypeEnum.PUSH:
      return RiNotificationLine;
    case StepTypeEnum.IN_APP:
      return RiNotificationLine;
    case StepTypeEnum.CHAT:
      return RiChat1Line;
    default:
      return RiCodeLine;
  }
};

export function PreviewContextPanel({
  workflow,
  value,
  onChange,
  subscriberData = {},
  currentStepId,
}: PreviewContextPanelProps) {
  const [payloadJsonData, setPayloadJsonData] = useState<any>({});
  const [payloadError, setPayloadError] = useState<string | null>(null);
  const [subscriberJsonData, setSubscriberJsonData] = useState<any>({});
  const [subscriberError, setSubscriberError] = useState<string | null>(null);
  const [stepResultsJsonData, setStepResultsJsonData] = useState<any>({});

  const [accordionValue, setAccordionValue] = useState<string[]>(['payload', 'subscriber', 'step-results']);
  const [openSteps, setOpenSteps] = useState<Record<string, boolean>>({});
  const isPayloadSchemaEnabled = useIsPayloadSchemaEnabled();

  // Parse JSON data for all sections
  useMemo(() => {
    try {
      const parsed = JSON.parse(value || '{}');

      // Handle payload
      if (isPayloadSchemaEnabled) {
        try {
          setPayloadJsonData(parsed.payload || {});
          setPayloadError(null);
        } catch (error) {
          // If parsing fails and we have a workflow payloadExample, use it as fallback
          if (workflow?.payloadExample) {
            setPayloadJsonData(workflow.payloadExample);
          }

          setPayloadError('Invalid JSON format');
        }
      }

      // Handle subscriber
      try {
        setSubscriberJsonData(parsed.subscriber || subscriberData || {});
        setSubscriberError(null);
      } catch (error) {
        setSubscriberJsonData(subscriberData || {});
        setSubscriberError('Invalid subscriber JSON format');
      }

      // Handle step results
      try {
        setStepResultsJsonData(parsed.steps || {});
      } catch (error) {
        setStepResultsJsonData({});
      }
    } catch (error) {
      // If entire JSON is invalid, set defaults
      if (isPayloadSchemaEnabled && workflow?.payloadExample) {
        setPayloadJsonData(workflow.payloadExample);
      }

      setSubscriberJsonData(subscriberData || {});
      setStepResultsJsonData({});
      setPayloadError('Invalid JSON format');
    }
  }, [value, isPayloadSchemaEnabled, workflow?.payloadExample, subscriberData, workflow, currentStepId]);

  const handlePayloadJsonChange = useCallback(
    (updatedData: any) => {
      try {
        const currentData = JSON.parse(value || '{}');
        const newData = { ...currentData, payload: updatedData };
        const stringified = JSON.stringify(newData, null, 2);
        const error = onChange(stringified);

        if (error) {
          setPayloadError(error.message);
        } else {
          setPayloadJsonData(updatedData);
          setPayloadError(null);
        }
      } catch (error) {
        setPayloadError('Failed to update JSON');
      }
    },
    [onChange, value]
  );

  const handleSubscriberJsonChange = useCallback(
    (updatedData: any) => {
      try {
        const currentData = JSON.parse(value || '{}');
        const newData = { ...currentData, subscriber: updatedData };
        const stringified = JSON.stringify(newData, null, 2);
        const error = onChange(stringified);

        if (error) {
          setSubscriberError(error.message);
        } else {
          setSubscriberJsonData(updatedData);
          setSubscriberError(null);
        }
      } catch (error) {
        setSubscriberError('Failed to update JSON');
      }
    },
    [onChange, value]
  );

  const handleStepResultsJsonChange = useCallback(
    (updatedData: any) => {
      try {
        const currentData = JSON.parse(value || '{}');
        const newData = { ...currentData, steps: updatedData };
        const stringified = JSON.stringify(newData, null, 2);
        const error = onChange(stringified);

        if (!error) {
          setStepResultsJsonData(updatedData);
        }
      } catch (error) {
        // Handle error silently or add logging if needed
      }
    },
    [onChange, value]
  );

  const accordionItemClassName =
    'border-b border-b-neutral-200 bg-transparent border-t-0 border-l-0 border-r-0 rounded-none p-4';
  const accordionTriggerClassName = 'text-label-xs';

  return (
    <Accordion type="multiple" value={accordionValue} onValueChange={setAccordionValue}>
      <AccordionItem value="payload" className={accordionItemClassName}>
        <AccordionTrigger className={accordionTriggerClassName}>Payload</AccordionTrigger>
        <AccordionContent className="flex flex-col gap-2">
          <div className="flex flex-1 flex-col gap-2 overflow-auto">
            <EditableJsonViewer
              value={payloadJsonData}
              onChange={handlePayloadJsonChange}
              schema={workflow?.payloadSchema}
              className="border-neutral-alpha-200 bg-background text-foreground-600 rounded-lg border border-solid"
            />
            {payloadError && <p className="text-destructive text-xs">{payloadError}</p>}
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="subscriber" className={accordionItemClassName}>
        <AccordionTrigger className={accordionTriggerClassName}>Subscriber</AccordionTrigger>
        <AccordionContent className="flex flex-col gap-2">
          <div className="flex flex-1 flex-col gap-2 overflow-auto">
            <EditableJsonViewer
              value={subscriberJsonData}
              onChange={handleSubscriberJsonChange}
              className="border-neutral-alpha-200 bg-background text-foreground-600 rounded-lg border border-solid"
            />
            {subscriberError && <p className="text-destructive text-xs">{subscriberError}</p>}
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="step-results" className={accordionItemClassName + ' border-b-0'}>
        <AccordionTrigger className={accordionTriggerClassName}>Step results</AccordionTrigger>
        <AccordionContent className="flex flex-col gap-2">
          {Object.keys(stepResultsJsonData).length > 0 ? (
            <div className="w-full space-y-1">
              {Object.entries(stepResultsJsonData).map(([stepId, stepData], index) => {
                const stepType = getStepType(workflow, stepId);
                const StepIcon = getStepTypeIcon(stepType);
                const stepName = getStepName(workflow, stepId);
                const isCurrentStep = stepId === currentStepId;
                const isOpen = openSteps[stepId] || false;

                return (
                  <div key={stepId} className="border-b border-neutral-100 last:border-b-0">
                    <button
                      type="button"
                      onClick={() => setOpenSteps((prev) => ({ ...prev, [stepId]: !isOpen }))}
                      className="flex w-full items-center gap-2 py-2 transition-colors hover:bg-neutral-50"
                    >
                      <div className="flex flex-1 items-center gap-2">
                        <StepIcon className="h-3 w-3 flex-shrink-0 text-neutral-300" />
                        <span className="text-label-2xs text-left font-medium">{stepName}</span>
                        {isCurrentStep && <span className="text-label-2xs text-neutral-500">(current step)</span>}
                        <div className="border-soft mx-2 flex-1 border-t" />
                      </div>
                      <div className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
                        {isOpen ? (
                          <RiContractUpDownLine className="h-3 w-3 text-neutral-400" />
                        ) : (
                          <RiExpandUpDownLine className="h-3 w-3 text-neutral-400" />
                        )}
                      </div>
                    </button>
                    {isOpen && (
                      <div className="pb-3">
                        <EditableJsonViewer
                          value={stepData}
                          onChange={(updatedStepData) => {
                            const updatedSteps = { ...stepResultsJsonData, [stepId]: updatedStepData };
                            handleStepResultsJsonChange(updatedSteps);
                          }}
                          className="border-neutral-alpha-200 bg-background text-foreground-600 rounded-lg border border-solid"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs italic text-neutral-500">no step results</p>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
