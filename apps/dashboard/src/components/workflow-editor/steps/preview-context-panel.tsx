import { Code2 } from '@/components/icons/code-2';
import { Editor } from '@/components/primitives/editor';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/primitives/accordion';
import { useIsPayloadSchemaEnabled } from '@/hooks/use-is-payload-schema-enabled';
import { WorkflowResponseDto } from '@novu/shared';
import { loadLanguage } from '@uiw/codemirror-extensions-langs';
import { useCallback, useMemo, useState } from 'react';
import { EditableJsonViewer } from './shared/editable-json-viewer/editable-json-viewer';

const basicSetup = { lineNumbers: true, defaultKeymap: true };
const extensions = [loadLanguage('json')?.extension ?? []];

type PreviewContextPanelProps = {
  workflow?: WorkflowResponseDto;
  value: string;
  onChange: (value: string) => Error | null;
};

export function PreviewContextPanel({ workflow, value, onChange }: PreviewContextPanelProps) {
  const [payloadJsonData, setPayloadJsonData] = useState<any>({});
  const [payloadError, setPayloadError] = useState<string | null>(null);
  const [accordionValue, setAccordionValue] = useState<string | undefined>('payload');
  const isPayloadSchemaEnabled = useIsPayloadSchemaEnabled();

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
    </Accordion>
  );
}
