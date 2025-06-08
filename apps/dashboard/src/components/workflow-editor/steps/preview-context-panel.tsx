import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/primitives/accordion';
import { Button } from '@/components/primitives/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { useIsPayloadSchemaEnabled } from '@/hooks/use-is-payload-schema-enabled';
import { WorkflowResponseDto, StepTypeEnum, ISubscriberResponseDto } from '@novu/shared';
import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment } from '@/context/environment/hooks';
import { getSubscribers } from '@/api/subscribers';
import {
  RiMailLine,
  RiSmartphoneLine,
  RiNotificationLine,
  RiChat1Line,
  RiCodeLine,
  RiContractUpDownLine,
  RiExpandUpDownLine,
  RiInformationLine,
} from 'react-icons/ri';
import { EditableJsonViewer } from './shared/editable-json-viewer/editable-json-viewer';
import { SubscriberAutocomplete } from '@/components/subscribers/subscriber-autocomplete';

type PreviewContextPanelProps = {
  workflow?: WorkflowResponseDto;
  value: string;
  onChange: (value: string) => Error | null;
  subscriberData?: Record<string, any>;
  currentStepId?: string;
};

type ParsedData = {
  payload: any;
  subscriber: any;
  steps: any;
};

type ValidationErrors = {
  payload: string | null;
  subscriber: string | null;
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

const parseJsonValue = (value: string): ParsedData => {
  try {
    const parsed = JSON.parse(value || '{}');
    return {
      payload: parsed.payload || {},
      subscriber: parsed.subscriber || {},
      steps: parsed.steps || {},
    };
  } catch {
    return { payload: {}, subscriber: {}, steps: {} };
  }
};

const createSubscriberData = (subscriber: ISubscriberResponseDto) => ({
  subscriberId: subscriber.subscriberId,
  firstName: subscriber.firstName || '',
  lastName: subscriber.lastName || '',
  email: subscriber.email || '',
  phone: subscriber.phone || '',
  avatar: subscriber.avatar || '',
  locale: subscriber.locale || 'en',
  timezone: subscriber.timezone || '',
  data: null,
});

export function PreviewContextPanel({ workflow, value, onChange, currentStepId }: PreviewContextPanelProps) {
  const [accordionValue, setAccordionValue] = useState<string[]>(['payload', 'subscriber', 'step-results']);
  const [openSteps, setOpenSteps] = useState<Record<string, boolean>>({});
  const [subscriberSearchValue, setSubscriberSearchValue] = useState<string>('');
  const [errors, setErrors] = useState<ValidationErrors>({ payload: null, subscriber: null });
  const [localParsedData, setLocalParsedData] = useState<ParsedData>(() => parseJsonValue(value));
  const [hasInitializedSubscriber, setHasInitializedSubscriber] = useState<boolean>(false);

  const isPayloadSchemaEnabled = useIsPayloadSchemaEnabled();
  const { currentUser } = useAuth();
  const { currentEnvironment } = useEnvironment();
  const hasLoadedCurrentUserRef = useRef<string>('');
  const isUpdatingRef = useRef<boolean>(false);

  // Update local parsed data when external value changes (but not during our own updates)
  useEffect(() => {
    if (!isUpdatingRef.current) {
      const parsed = parseJsonValue(value);
      setLocalParsedData({
        payload: isPayloadSchemaEnabled ? parsed.payload || workflow?.payloadExample || {} : {},
        subscriber: parsed.subscriber || {},
        steps: parsed.steps || {},
      });
    }
  }, [value, isPayloadSchemaEnabled, workflow?.payloadExample]);

  // Generic JSON update handler
  const updateJsonSection = useCallback(
    (section: keyof ParsedData, updatedData: any) => {
      isUpdatingRef.current = true;

      try {
        const currentData = parseJsonValue(value);
        const newData = { ...currentData, [section]: updatedData };
        const stringified = JSON.stringify(newData, null, 2);
        const error = onChange(stringified);

        if (error) {
          setErrors((prev) => ({ ...prev, [section]: error.message }));
        } else {
          // Update local state immediately to prevent flickering
          setLocalParsedData((prev) => ({ ...prev, [section]: updatedData }));
          setErrors((prev) => ({ ...prev, [section]: null }));
        }
      } catch (error) {
        setErrors((prev) => ({ ...prev, [section]: 'Failed to update JSON' }));
      } finally {
        // Reset the flag after a brief delay to allow the parent state to update
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 0);
      }
    },
    [onChange, value]
  );

  const handlePayloadJsonChange = useCallback(
    (updatedData: any) => updateJsonSection('payload', updatedData),
    [updateJsonSection]
  );

  const handleSubscriberJsonChange = useCallback(
    (updatedData: any) => updateJsonSection('subscriber', updatedData),
    [updateJsonSection]
  );

  const handleStepResultsJsonChange = useCallback(
    (updatedData: any) => updateJsonSection('steps', updatedData),
    [updateJsonSection]
  );

  const handleSubscriberSelection = useCallback(
    (subscriber: ISubscriberResponseDto) => {
      const subscriberData = createSubscriberData(subscriber);
      handleSubscriberJsonChange(subscriberData);
      setSubscriberSearchValue('');
    },
    [handleSubscriberJsonChange]
  );

  const toggleStepOpen = useCallback((stepId: string) => {
    setOpenSteps((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
  }, []);

  // Load current user's subscriber data (only once per user/environment and only if no existing subscriber data)
  useEffect(() => {
    const loadCurrentUserSubscriber = async () => {
      if (!currentUser?.email || !currentEnvironment || hasInitializedSubscriber) return;

      setHasInitializedSubscriber(true);

      const userEnvKey = `${currentUser.email}-${currentEnvironment._id}`;
      if (hasLoadedCurrentUserRef.current === userEnvKey) return;

      try {
        const response = await getSubscribers({
          environment: currentEnvironment,
          email: currentUser.email,
          limit: 1,
        });

        if (response.data?.[0]) {
          const newSubscriberData = createSubscriberData(response.data[0]);
          handleSubscriberJsonChange(newSubscriberData);
        }
      } catch {
        // Silently handle error - user might not have a subscriber record
      } finally {
        hasLoadedCurrentUserRef.current = userEnvKey;
      }
    };

    // loadCurrentUserSubscriber();
  }, [currentUser?.email, currentEnvironment?._id, hasInitializedSubscriber, handleSubscriberJsonChange]);

  const accordionItemClassName =
    'border-b border-b-neutral-200 bg-transparent border-t-0 border-l-0 border-r-0 rounded-none p-4';
  const accordionTriggerClassName = 'text-label-xs';

  const stepEntries = Object.entries(localParsedData.steps || {});

  return (
    <Accordion type="multiple" value={accordionValue} onValueChange={setAccordionValue}>
      <AccordionItem value="payload" className={accordionItemClassName}>
        <AccordionTrigger className={accordionTriggerClassName}>
          <div className="flex items-center gap-0.5">
            Payload
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-foreground-400 inline-block hover:cursor-help">
                  <RiInformationLine className="size-3" />
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                The data that will be sent to your workflow when triggered. This can include dynamic values and
                variables.
              </TooltipContent>
            </Tooltip>
          </div>
        </AccordionTrigger>
        <AccordionContent className="flex flex-col gap-2">
          <div className="flex flex-1 flex-col gap-2 overflow-auto">
            <EditableJsonViewer
              value={localParsedData.payload}
              onChange={handlePayloadJsonChange}
              schema={workflow?.payloadSchema}
              className="border-neutral-alpha-200 bg-background text-foreground-600 rounded-lg border border-solid"
            />
            {errors.payload && <p className="text-destructive text-xs">{errors.payload}</p>}
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="subscriber" className={accordionItemClassName}>
        <AccordionTrigger className={accordionTriggerClassName}>
          <div className="flex items-center gap-0.5">
            Subscriber
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-foreground-400 inline-block hover:cursor-help">
                  <RiInformationLine className="size-3" />
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Information about the recipient of the notification, including their profile data and preferences.
              </TooltipContent>
            </Tooltip>
          </div>
        </AccordionTrigger>
        <AccordionContent className="flex flex-col gap-2">
          <SubscriberAutocomplete
            value={subscriberSearchValue}
            onChange={setSubscriberSearchValue}
            onSelectSubscriber={handleSubscriberSelection}
            size="xs"
            className="w-full"
          />
          <div className="flex flex-1 flex-col gap-2 overflow-auto">
            <EditableJsonViewer
              value={localParsedData.subscriber}
              onChange={handleSubscriberJsonChange}
              className="border-neutral-alpha-200 bg-background text-foreground-600 rounded-lg border border-solid"
            />
            {errors.subscriber && <p className="text-destructive text-xs">{errors.subscriber}</p>}
          </div>
          <div className="text-text-soft flex items-center gap-1.5 text-[10px] font-normal leading-[13px]">
            <RiInformationLine className="h-3 w-3 flex-shrink-0" />
            <span>Changes here only affect the preview and won't be saved to the subscriber.</span>
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="step-results" className={accordionItemClassName + ' border-b-0'}>
        <AccordionTrigger className={accordionTriggerClassName}>
          <div className="flex items-center gap-0.5">
            Step results
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-foreground-400 inline-block hover:cursor-help">
                  <RiInformationLine className="size-3" />
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Output data from previous steps in the workflow that can be used in subsequent steps.
              </TooltipContent>
            </Tooltip>
          </div>
        </AccordionTrigger>
        <AccordionContent className="flex flex-col gap-2">
          {stepEntries.length > 0 ? (
            <div className="w-full space-y-1">
              {stepEntries.map(([stepId, stepData]) => {
                const stepType = getStepType(workflow, stepId);
                const StepIcon = getStepTypeIcon(stepType);
                const stepName = getStepName(workflow, stepId);
                const isCurrentStep = stepId === currentStepId;
                const isOpen = openSteps[stepId] || false;

                return (
                  <div key={stepId} className="border-b border-neutral-100 last:border-b-0">
                    <button
                      type="button"
                      onClick={() => toggleStepOpen(stepId)}
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
                    {isOpen &&
                      (stepData && Object.keys(stepData).length > 0 ? (
                        <div className="pb-3">
                          <EditableJsonViewer
                            value={stepData}
                            onChange={(updatedStepData) => {
                              const updatedSteps = { ...(localParsedData.steps || {}), [stepId]: updatedStepData };
                              handleStepResultsJsonChange(updatedSteps);
                            }}
                            className="border-neutral-alpha-200 bg-background text-foreground-600 rounded-lg border border-solid"
                          />
                        </div>
                      ) : (
                        <p className="text-xs italic text-neutral-500">no step results</p>
                      ))}
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
