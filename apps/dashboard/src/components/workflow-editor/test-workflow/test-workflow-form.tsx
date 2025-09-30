import type { WorkflowResponseDto } from '@novu/shared';
import { loadLanguage } from '@uiw/codemirror-extensions-langs';
import { useCallback, useMemo, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { FaCode } from 'react-icons/fa6';
import { RiSendPlaneFill } from 'react-icons/ri';
import { Editor } from '@/components/primitives/editor';
import { useIsPayloadSchemaEnabled } from '@/hooks/use-is-payload-schema-enabled';
import {
  type CodeSnippet,
  createCurlSnippet,
  createFrameworkSnippet,
  createGoSnippet,
  createNodeJsSnippet,
  createPhpSnippet,
  createPythonSnippet,
} from '@/utils/code-snippets';
import { ResourceOriginEnum } from '@/utils/enums';
import { capitalize } from '@/utils/string';
import { Code2 } from '../../icons/code-2';
import { Button } from '../../primitives/button';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../primitives/form/form';
import { Input } from '../../primitives/input';
import { Panel, PanelContent, PanelHeader } from '../../primitives/panel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../primitives/tabs';
import { TestWorkflowFormType } from '../schema';
import { EditableJsonViewer } from '../steps/shared/editable-json-viewer/editable-json-viewer';
import { SnippetEditor } from './snippet-editor';
import { TestWorkflowInstructions } from './test-workflow-instructions';
import { SnippetLanguage } from './types';

const tabsTriggerClassName = 'pt-1';
const codePanelClassName = 'h-full';

const LANGUAGE_TO_SNIPPET_UTIL: Record<SnippetLanguage, (props: CodeSnippet) => string> = {
  shell: createCurlSnippet,
  framework: createFrameworkSnippet,
  typescript: createNodeJsSnippet,
  php: createPhpSnippet,
  go: createGoSnippet,
  python: createPythonSnippet,
};

const basicSetup = { lineNumbers: true, defaultKeymap: true };
const extensions = [loadLanguage('json')?.extension ?? []];

export const TestWorkflowForm = ({ workflow }: { workflow?: WorkflowResponseDto }) => {
  const { control, setValue } = useFormContext<TestWorkflowFormType>();
  const [activeSnippetTab, setActiveSnippetTab] = useState<SnippetLanguage>(() =>
    workflow?.origin === ResourceOriginEnum.EXTERNAL ? 'framework' : 'typescript'
  );
  const [showInstructions, setShowInstructions] = useState(false);
  const [payloadJsonData, setPayloadJsonData] = useState<any>({});
  const to = useWatch({ name: 'to', control });
  const payload = useWatch({ name: 'payload', control });
  const isPayloadSchemaEnabled = useIsPayloadSchemaEnabled();
  const identifier = workflow?.workflowId ?? '';
  const snippetValue = useMemo(() => {
    const snippetUtil = LANGUAGE_TO_SNIPPET_UTIL[activeSnippetTab];
    return snippetUtil({ identifier, to, payload });
  }, [activeSnippetTab, identifier, to, payload]);

  // Parse JSON data for JsonViewer and initialize with workflow payloadExample if available
  useMemo(() => {
    if (isPayloadSchemaEnabled) {
      try {
        const parsed = JSON.parse(payload || '{}');
        setPayloadJsonData(parsed);
      } catch (error) {
        // If parsing fails and we have a workflow payloadExample, use it as fallback
        if (workflow?.payloadExample) {
          setPayloadJsonData(workflow.payloadExample);
        }
      }
    }
  }, [payload, isPayloadSchemaEnabled, workflow?.payloadExample]);

  const handleJsonChange = useCallback(
    (updatedData: any) => {
      try {
        const stringified = JSON.stringify(updatedData, null, 2);
        setValue('payload', stringified);
        setPayloadJsonData(updatedData);
      } catch (error) {
        // Handle error silently
      }
    },
    [setValue]
  );

  return (
    <>
      <div className="flex w-full flex-1 flex-col gap-3 overflow-hidden p-3">
        <div className="grid max-h-[50%] min-h-[50%] flex-1 grid-cols-1 gap-3 xl:grid-cols-[1fr_2fr]">
          <Panel className="h-full">
            <PanelHeader>
              <RiSendPlaneFill className="size-4" />
              <span className="text-neutral-950">Send to</span>
            </PanelHeader>
            <PanelContent className="flex flex-col gap-2">
              {Object.keys(to).map((key) => (
                <FormField
                  key={key}
                  control={control}
                  name={`to.${key}`}
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel htmlFor={key}>{capitalize(key)}</FormLabel>
                      <FormControl>
                        <Input size="xs" id={key} {...(field as any)} hasError={!!fieldState.error} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </PanelContent>
          </Panel>

          <Panel>
            <PanelHeader>
              <Code2 className="text-feature size-3" />
              <span className="text-neutral-950">Payload</span>
            </PanelHeader>
            <PanelContent className={'flex flex-col overflow-hidden' + (isPayloadSchemaEnabled ? ' p-0' : '')}>
              <FormField
                control={control}
                name="payload"
                render={({ field: { ref: _ref, ...restField } }) => (
                  <FormItem className="flex flex-1 flex-col gap-2 overflow-auto">
                    <FormControl>
                      <>
                        {isPayloadSchemaEnabled ? (
                          <EditableJsonViewer
                            value={payloadJsonData}
                            onChange={handleJsonChange}
                            schema={workflow?.payloadSchema}
                            className="border-none p-0"
                          />
                        ) : (
                          <Editor
                            lang="json"
                            basicSetup={basicSetup}
                            extensions={extensions}
                            className="overflow-auto"
                            {...restField}
                            multiline
                          />
                        )}
                        <FormMessage />
                      </>
                    </FormControl>
                  </FormItem>
                )}
              />
            </PanelContent>
          </Panel>
        </div>

        <div className="flex max-h-[50%] min-h-[50%] flex-1 flex-col">
          <Panel className="flex flex-1 flex-col overflow-hidden">
            <Tabs
              className="flex max-h-full flex-1 flex-col border-none"
              value={activeSnippetTab}
              onValueChange={(value) => setActiveSnippetTab(value as SnippetLanguage)}
            >
              <TabsList className="border-t-transparent" variant="regular">
                <TabsTrigger className={tabsTriggerClassName} value="typescript" variant="regular" size="xl">
                  NodeJS
                </TabsTrigger>
                <TabsTrigger className={tabsTriggerClassName} value="shell" variant="regular" size="xl">
                  cURL
                </TabsTrigger>
                <TabsTrigger className={tabsTriggerClassName} value="php" variant="regular" size="xl">
                  PHP
                </TabsTrigger>
                <TabsTrigger className={tabsTriggerClassName} value="go" variant="regular" size="xl">
                  Golang
                </TabsTrigger>
                <TabsTrigger className={tabsTriggerClassName} value="python" variant="regular" size="xl">
                  Python
                </TabsTrigger>
                <Button
                  mode="ghost"
                  variant="primary"
                  className="ml-auto"
                  size="xs"
                  onClick={() => setShowInstructions(true)}
                >
                  <FaCode className="size-4" />
                  View Setup Instructions
                </Button>
              </TabsList>
              <TabsContent value="shell" className={codePanelClassName}>
                <SnippetEditor language="shell" value={snippetValue} />
              </TabsContent>
              <TabsContent value="typescript" className={codePanelClassName}>
                <SnippetEditor language="typescript" value={snippetValue} />
              </TabsContent>
              <TabsContent value="php" className={codePanelClassName}>
                <SnippetEditor language="php" value={snippetValue} />
              </TabsContent>
              <TabsContent value="go" className={codePanelClassName}>
                <SnippetEditor language="go" value={snippetValue} />
              </TabsContent>
              <TabsContent value="python" className={codePanelClassName}>
                <SnippetEditor language="python" value={snippetValue} />
              </TabsContent>
            </Tabs>
          </Panel>
        </div>
      </div>

      <TestWorkflowInstructions
        isOpen={showInstructions}
        onClose={() => setShowInstructions(false)}
        workflow={workflow}
        to={to}
        payload={payload}
      />
    </>
  );
};
