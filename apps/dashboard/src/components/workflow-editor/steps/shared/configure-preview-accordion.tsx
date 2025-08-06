import { type WorkflowResponseDto } from '@novu/shared';
import { loadLanguage } from '@uiw/codemirror-extensions-langs';
import { JSONSchema7 } from 'json-schema';
import { CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import { RiListView } from 'react-icons/ri';
import { Code2 } from '@/components/icons/code-2';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/primitives/accordion';
import { Button } from '@/components/primitives/button';
import { Editor } from '@/components/primitives/editor';
import { useCreateVariable } from '@/components/variable/hooks/use-create-variable';
import { PayloadSchemaDrawer } from '@/components/workflow-editor/payload-schema-drawer';
import { useIsPayloadSchemaEnabled } from '@/hooks/use-is-payload-schema-enabled';
import { EditableJsonViewer } from './editable-json-viewer/editable-json-viewer';

const extensions = [loadLanguage('json')?.extension ?? []];

type ConfigurePreviewAccordionProps = {
  editorValue: string;
  setEditorValue: (value: string) => Error | null;
  onUpdate: () => void;
  workflow?: WorkflowResponseDto;
  schema?: JSONSchema7;
};

export const ConfigurePreviewAccordion = ({
  editorValue,
  setEditorValue,
  onUpdate,
  workflow,
  schema,
}: ConfigurePreviewAccordionProps) => {
  const [accordionValue, setAccordionValue] = useState<string | undefined>('payload');
  const [payloadError, setPayloadError] = useState<string | null>(null);
  const [height, setHeight] = useState(0);
  const [jsonData, setJsonData] = useState<any>({});
  const [isValidJson, setIsValidJson] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  const isPayloadSchemaEnabled = useIsPayloadSchemaEnabled();

  const { isPayloadSchemaDrawerOpen, highlightedVariableKey, openSchemaDrawer, closeSchemaDrawer } =
    useCreateVariable();

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (contentRef.current) {
        const rect = contentRef.current.getBoundingClientRect();
        setHeight(rect.height);
      }
    }, 0);

    return () => clearTimeout(timeout);
  }, [editorValue, jsonData]);

  useEffect(() => {
    if (isPayloadSchemaEnabled) {
      try {
        const parsed = JSON.parse(editorValue || '{}');

        setJsonData(parsed);
        setPayloadError(null);
        setIsValidJson(true);
      } catch (error) {
        setPayloadError('Invalid JSON format');
        setIsValidJson(false);
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
    (updatedData: any) => {
      try {
        const stringified = JSON.stringify(updatedData, null, 2);
        setEditorValueCallback(stringified);
        setJsonData(updatedData);
      } catch (error) {
        setPayloadError('Failed to update JSON');
      }
    },
    [setEditorValueCallback]
  );

  const handleReset = useCallback(() => {
    // Use workflow payloadExample if available, otherwise use empty object
    const resetValue =
      isPayloadSchemaEnabled && workflow?.payloadExample
        ? JSON.stringify({ payload: workflow.payloadExample }, null, 2)
        : '{}';

    setEditorValueCallback(resetValue);

    if (isPayloadSchemaEnabled) {
      setJsonData(workflow?.payloadExample ? { payload: workflow?.payloadExample } : {});
    }

    onUpdate();
  }, [isPayloadSchemaEnabled, workflow?.payloadExample, setEditorValueCallback, onUpdate]);

  return (
    <>
      <Accordion type="single" collapsible value={accordionValue} onValueChange={setAccordionValue}>
        <AccordionItem value="payload">
          <AccordionTrigger>
            <div className="flex w-full items-center justify-between">
              <div className="text-label-sm flex items-center gap-1">
                <Code2 className="text-feature size-4" />
                Configure preview
              </div>
              {isPayloadSchemaEnabled && (
                <Button
                  size="2xs"
                  leadingIcon={RiListView}
                  variant="secondary"
                  mode="ghost"
                  className="ml-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    openSchemaDrawer();
                  }}
                >
                  Edit schema
                </Button>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent
            ref={contentRef}
            className="flex flex-col gap-2"
            style={{ '--radix-collapsible-content-height': `${height}px` } as CSSProperties}
          >
            {isPayloadSchemaEnabled ? (
              isValidJson ? (
                <EditableJsonViewer value={jsonData} onChange={handleJsonChange} schema={schema as JSONSchema7} />
              ) : (
                <Editor
                  value={editorValue}
                  onChange={setEditorValueCallback}
                  lang="json"
                  extensions={extensions}
                  multiline
                  className="border-neutral-alpha-200 bg-background text-foreground-600 mx-0 mt-0 rounded-lg border border-dashed p-3"
                />
              )
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
                onClick={handleReset}
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

      <PayloadSchemaDrawer
        isOpen={isPayloadSchemaDrawerOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            closeSchemaDrawer();
          }
        }}
        workflow={workflow}
        highlightedPropertyKey={highlightedVariableKey}
      />
    </>
  );
};
