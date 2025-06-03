import { Code2 } from '@/components/icons/code-2';
import { Editor } from '@/components/primitives/editor';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/primitives/accordion';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/primitives/form/form';
import { Input } from '@/components/primitives/input';
import { Button } from '@/components/primitives/button';
import { useIsPayloadSchemaEnabled } from '@/hooks/use-is-payload-schema-enabled';
import { WorkflowResponseDto, StepTypeEnum } from '@novu/shared';
import { loadLanguage } from '@uiw/codemirror-extensions-langs';
import { useCallback, useMemo, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { RiSendPlaneFill, RiListCheck3, RiRefreshLine } from 'react-icons/ri';
import { capitalize } from '@/utils/string';
import { EditableJsonViewer } from './shared/editable-json-viewer/editable-json-viewer';

const basicSetup = { lineNumbers: true, defaultKeymap: true };
const extensions = [loadLanguage('json')?.extension ?? []];

type PreviewContextPanelProps = {
  workflow?: WorkflowResponseDto;
  value: string;
  onChange: (value: string) => Error | null;
  subscriberData?: Record<string, any>;
  currentStepId?: string;
};

// Mock step results data based on step types
const generateMockStepResults = (workflow?: WorkflowResponseDto, currentStepId?: string) => {
  const results: Record<string, any> = {};

  workflow?.steps?.forEach((step) => {
    const stepKey = `steps.${step.stepId}`;

    switch (step.type) {
      case StepTypeEnum.IN_APP:
        results[`${stepKey}.seen`] = step.stepId === currentStepId ? false : true;
        results[`${stepKey}.read`] = step.stepId === currentStepId ? false : true;
        results[`${stepKey}.lastSeenDate`] = step.stepId === currentStepId ? null : new Date().toISOString();
        results[`${stepKey}.lastReadDate`] = step.stepId === currentStepId ? null : new Date().toISOString();
        results[`${stepKey}.isOnline`] = step.stepId === currentStepId ? false : true;
        break;
      case StepTypeEnum.EMAIL:
        results[`${stepKey}.sent`] = step.stepId === currentStepId ? false : true;
        results[`${stepKey}.delivered`] = step.stepId === currentStepId ? false : true;
        results[`${stepKey}.opened`] = step.stepId === currentStepId ? false : true;
        results[`${stepKey}.clicked`] = step.stepId === currentStepId ? false : false;
        break;
      case StepTypeEnum.SMS:
        results[`${stepKey}.sent`] = step.stepId === currentStepId ? false : true;
        results[`${stepKey}.delivered`] = step.stepId === currentStepId ? false : true;
        break;
      case StepTypeEnum.PUSH:
        results[`${stepKey}.sent`] = step.stepId === currentStepId ? false : true;
        results[`${stepKey}.delivered`] = step.stepId === currentStepId ? false : true;
        results[`${stepKey}.clicked`] = step.stepId === currentStepId ? false : false;
        break;
      case StepTypeEnum.CHAT:
        results[`${stepKey}.sent`] = step.stepId === currentStepId ? false : true;
        results[`${stepKey}.delivered`] = step.stepId === currentStepId ? false : true;
        break;
      default:
        results[`${stepKey}.executed`] = step.stepId === currentStepId ? false : true;
        break;
    }
  });

  return results;
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
  const [accordionValue, setAccordionValue] = useState<string | undefined>('payload');
  const [stepResults, setStepResults] = useState<Record<string, any>>(() =>
    generateMockStepResults(workflow, currentStepId)
  );
  const isPayloadSchemaEnabled = useIsPayloadSchemaEnabled();
  const form = useFormContext();

  // Watch subscriber form values if form context is available
  const subscriberValues = useWatch({
    name: 'to',
    control: form?.control,
    defaultValue: subscriberData,
  });

  // Parse JSON data for JsonViewer and initialize with workflow payloadExample if available
  useMemo(() => {
    if (isPayloadSchemaEnabled) {
      try {
        const parsed = JSON.parse(value || '{}');
        setPayloadJsonData(parsed);
        setPayloadError(null);
      } catch (error) {
        // If parsing fails and we have a workflow payloadExample, use it as fallback
        if (workflow?.payloadExample) {
          setPayloadJsonData(workflow.payloadExample);
        }

        setPayloadError('Invalid JSON format');
      }
    }
  }, [value, isPayloadSchemaEnabled, workflow?.payloadExample]);

  const handleJsonChange = useCallback(
    (updatedData: any) => {
      try {
        const stringified = JSON.stringify(updatedData, null, 2);
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
    [onChange]
  );

  const handleEditorChange = useCallback(
    (newValue: string) => {
      const error = onChange(newValue);

      if (error) {
        setPayloadError(error.message);
      } else {
        setPayloadError(null);
      }
    },
    [onChange]
  );

  const handleStepResultChange = useCallback((key: string, value: any) => {
    setStepResults((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const resetStepResults = useCallback(() => {
    setStepResults(generateMockStepResults(workflow, currentStepId));
  }, [workflow, currentStepId]);

  const renderStepResultValue = (key: string, value: any) => {
    if (typeof value === 'boolean') {
      return (
        <select
          value={value.toString()}
          onChange={(e) => handleStepResultChange(key, e.target.value === 'true')}
          className="border-neutral-alpha-200 bg-background text-foreground-600 rounded border px-2 py-1 text-xs"
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      );
    }

    if (value === null) {
      return (
        <select
          value="null"
          onChange={(e) => handleStepResultChange(key, e.target.value === 'null' ? null : e.target.value)}
          className="border-neutral-alpha-200 bg-background text-foreground-600 rounded border px-2 py-1 text-xs"
        >
          <option value="null">null</option>
          <option value="string">string</option>
        </select>
      );
    }

    return (
      <input
        type="text"
        value={value}
        onChange={(e) => handleStepResultChange(key, e.target.value)}
        className="border-neutral-alpha-200 bg-background text-foreground-600 rounded border px-2 py-1 text-xs"
      />
    );
  };

  return (
    <Accordion type="single" collapsible value={accordionValue} onValueChange={setAccordionValue}>
      <AccordionItem value="payload">
        <AccordionTrigger>
          <div className="flex items-center gap-2">
            <Code2 className="text-feature size-4" />
            <span className="text-sm font-medium">Payload</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="flex flex-col gap-2 pt-2">
          <div className="flex flex-1 flex-col gap-2 overflow-auto">
            {isPayloadSchemaEnabled ? (
              <EditableJsonViewer
                value={payloadJsonData}
                onChange={handleJsonChange}
                schema={workflow?.payloadSchema}
                className="border-neutral-alpha-200 bg-background text-foreground-600 rounded-lg border border-dashed p-3"
              />
            ) : (
              <Editor
                lang="json"
                basicSetup={basicSetup}
                extensions={extensions}
                className="border-neutral-alpha-200 bg-background text-foreground-600 rounded-lg border border-dashed p-3"
                value={value}
                onChange={handleEditorChange}
                multiline
              />
            )}
            {payloadError && <p className="text-destructive text-xs">{payloadError}</p>}
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="subscriber">
        <AccordionTrigger>
          <div className="flex items-center gap-2">
            <RiSendPlaneFill className="size-4" />
            <span className="text-sm font-medium">Subscriber</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="flex flex-col gap-2 pt-2">
          <div className="flex flex-col gap-2">
            {Object.keys(subscriberValues || subscriberData).map((key) => (
              <FormField
                key={key}
                control={form?.control}
                name={`to.${key}`}
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel htmlFor={key}>{capitalize(key)}</FormLabel>
                    <FormControl>
                      <Input
                        size="xs"
                        id={key}
                        {...(field as any)}
                        hasError={!!fieldState.error}
                        className="border-neutral-alpha-200 bg-background text-foreground-600"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            {Object.keys(subscriberValues || subscriberData).length === 0 && (
              <p className="text-xs text-neutral-500">No subscriber fields available</p>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="step-results">
        <AccordionTrigger>
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              <RiListCheck3 className="size-4" />
              <span className="text-sm font-medium">Step results</span>
            </div>
            <Button
              size="2xs"
              leadingIcon={RiRefreshLine}
              variant="secondary"
              mode="ghost"
              className="ml-auto"
              onClick={(e) => {
                e.stopPropagation();
                resetStepResults();
              }}
            >
              Reset defaults
            </Button>
          </div>
        </AccordionTrigger>
        <AccordionContent className="flex flex-col gap-2 pt-2">
          <div className="flex flex-col gap-2">
            {Object.entries(stepResults).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-neutral-500">{key}</span>
                {renderStepResultValue(key, value)}
              </div>
            ))}
            {Object.keys(stepResults).length === 0 && (
              <p className="text-xs italic text-neutral-500">no step results</p>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
