import { useCallback, useState } from 'react';
import { RiContractUpDownLine, RiExpandUpDownLine, RiInformationLine } from 'react-icons/ri';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/primitives/accordion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { ACCORDION_STYLES } from '../constants/preview-context.constants';
import { EditableJsonViewer } from '../shared/editable-json-viewer/editable-json-viewer';
import { StepResultsSectionProps } from '../types/preview-context.types';
import { synchronizeDigestStepData } from '../utils/digest-sync.utils';
import { getStepName, getStepType, getStepTypeIcon } from '../utils/preview-context.utils';

export function PreviewStepResultsSection({
  localParsedData,
  workflow,
  onUpdate,
  currentStepId,
}: StepResultsSectionProps) {
  const [openSteps, setOpenSteps] = useState<Record<string, boolean>>({});

  const toggleStepOpen = useCallback((stepId: string) => {
    setOpenSteps((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
  }, []);

  const handleStepDataChange = useCallback(
    (stepId: string, updatedStepData: any) => {
      const stepType = getStepType(workflow, stepId);

      let finalStepData = updatedStepData;

      // Apply digest synchronization if it's a digest step
      if (stepType === 'digest') {
        const currentStepData = localParsedData.steps?.[stepId] || {};
        finalStepData = synchronizeDigestStepData(updatedStepData, currentStepData, workflow?.payloadExample);
      }

      const updatedSteps = {
        ...(localParsedData.steps || {}),
        [stepId]: finalStepData,
      };

      onUpdate('steps', updatedSteps);
    },
    [workflow, localParsedData.steps, onUpdate]
  );

  const getCurrentStepData = useCallback(
    (stepId: string, stepData: any) => {
      const stepType = getStepType(workflow, stepId);

      // For digest steps, ensure the data is always synchronized
      if (stepType === 'digest' && stepData && 'eventCount' in stepData && 'events' in stepData) {
        return synchronizeDigestStepData(stepData, {}, workflow?.payloadExample);
      }

      return stepData;
    },
    [workflow]
  );

  const stepEntries = Object.entries(localParsedData.steps || {});

  return (
    <AccordionItem value="step-results" className={ACCORDION_STYLES.itemLast}>
      <AccordionTrigger className={ACCORDION_STYLES.trigger}>
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
          <div className="w-full">
            {stepEntries.map(([stepId, stepData]) => {
              const stepType = getStepType(workflow, stepId);
              const StepIcon = getStepTypeIcon(stepType);
              const stepName = getStepName(workflow, stepId);
              const isCurrentStep = stepId === currentStepId;
              const isOpen = openSteps[stepId] || false;
              const currentStepData = getCurrentStepData(stepId, stepData);

              return (
                <div key={stepId}>
                  <button
                    type="button"
                    onClick={() => toggleStepOpen(stepId)}
                    className="flex w-full items-center gap-2 py-1.5 transition-colors hover:bg-neutral-50"
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
                    (currentStepData && Object.keys(currentStepData).length > 0 ? (
                      <div className="pb-3">
                        <EditableJsonViewer
                          key={`${stepId}-${JSON.stringify(currentStepData)}`}
                          value={currentStepData}
                          onChange={(updatedStepData) => handleStepDataChange(stepId, updatedStepData)}
                          className={ACCORDION_STYLES.jsonViewer}
                        />
                        {stepType === 'digest' && (
                          <div className="pt-2">
                            <div className="text-text-soft flex items-center gap-1.5 text-[10px] font-normal leading-[13px]">
                              <RiInformationLine className="h-3 w-3 flex-shrink-0" />
                              <span>
                                Event count and events array are synchronized automatically. The event payload is
                                originating from the workflow trigger payload.
                              </span>
                            </div>
                          </div>
                        )}
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
  );
}
