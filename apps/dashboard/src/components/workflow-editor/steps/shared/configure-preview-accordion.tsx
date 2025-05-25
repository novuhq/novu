import { Code2 } from '@/components/icons/code-2';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/primitives/accordion';
import { Button } from '@/components/primitives/button';
import { Editor } from '@/components/primitives/editor';
import { loadLanguage } from '@uiw/codemirror-extensions-langs';
import { CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { EditableJsonViewer } from './editable-json-viewer';

const extensions = [loadLanguage('json')?.extension ?? []];

type ConfigurePreviewAccordionProps = {
  editorValue: string;
  setEditorValue: (value: string) => Error | null;
  onUpdate: () => void;
};

export const ConfigurePreviewAccordion = ({
  editorValue,
  setEditorValue,
  onUpdate,
}: ConfigurePreviewAccordionProps) => {
  const [accordionValue, setAccordionValue] = useState<string | undefined>('payload');
  const [payloadError, setPayloadError] = useState<string | null>(null);
  const [height, setHeight] = useState(0);
  const [jsonData, setJsonData] = useState<any>({});
  const contentRef = useRef<HTMLDivElement>(null);
  const isPayloadSchemaEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_PAYLOAD_SCHEMA_ENABLED);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (contentRef.current) {
        const rect = contentRef.current.getBoundingClientRect();
        setHeight(rect.height);
      }
    }, 0);

    return () => clearTimeout(timeout);
  }, [editorValue, jsonData]);

  // Parse JSON data for JsonViewer
  useEffect(() => {
    if (isPayloadSchemaEnabled) {
      try {
        const parsed = JSON.parse(editorValue || '{}');
        setJsonData(parsed);
        setPayloadError(null);
      } catch (error) {
        setPayloadError('Invalid JSON format');
      }
    }
  }, [editorValue, isPayloadSchemaEnabled]);

  const setEditorValueCallback = useCallback(
    (value: string) => {
      const error = setEditorValue(value);

      if (error) {
        setPayloadError(error.message);
      } else {
        setPayloadError(null);
      }
    },
    [setEditorValue]
  );

  const handleJsonChange = useCallback(
    (path: (string | number)[], currentValue: any, newValue: any) => {
      try {
        // Create a deep copy of the current data
        const updatedData = JSON.parse(JSON.stringify(jsonData));

        // Navigate to the correct path and update the value
        let current = updatedData;

        for (let i = 0; i < path.length - 1; i++) {
          current = current[path[i]];
        }

        if (path.length > 0) {
          current[path[path.length - 1]] = newValue;
        } else {
          // Root level change
          Object.assign(updatedData, newValue);
        }

        const stringified = JSON.stringify(updatedData, null, 2);
        setEditorValueCallback(stringified);
        setJsonData(updatedData);
      } catch (error) {
        setPayloadError('Failed to update JSON');
      }
    },
    [jsonData, setEditorValueCallback]
  );

  return (
    <Accordion type="single" collapsible value={accordionValue} onValueChange={setAccordionValue}>
      <AccordionItem value="payload">
        <AccordionTrigger>
          <div className="flex items-center gap-1">
            <Code2 className="text-feature size-3" />
            Configure preview
          </div>
        </AccordionTrigger>
        <AccordionContent
          ref={contentRef}
          className="flex flex-col gap-2"
          style={{ '--radix-collapsible-content-height': `${height}px` } as CSSProperties}
        >
          {isPayloadSchemaEnabled ? (
            <EditableJsonViewer value={jsonData} onChange={handleJsonChange} />
          ) : (
            <Editor
              value={editorValue}
              onChange={setEditorValueCallback}
              lang="json"
              extensions={extensions}
              multiline
              className="border-neutral-alpha-200 bg-background text-foreground-600 mx-0 mt-0 rounded-lg border border-dashed p-3"
            />
          )}
          {payloadError && <p className="text-destructive text-xs">{payloadError}</p>}
          <div className="flex justify-end gap-1">
            <Button
              size="2xs"
              type="button"
              variant="secondary"
              mode="outline"
              className="self-end"
              onClick={() => {
                setEditorValueCallback('{}');

                if (isPayloadSchemaEnabled) {
                  setJsonData({});
                }

                onUpdate();
              }}
            >
              Reset
            </Button>
            <Button
              size="2xs"
              type="button"
              variant="primary"
              mode="outline"
              className="self-end"
              disabled={payloadError !== null}
              onClick={onUpdate}
            >
              Apply
            </Button>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};
