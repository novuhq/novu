import { Editor } from '@/components/primitives/editor';
import {
  type CodeSnippet,
  createCurlSnippet,
  createFrameworkSnippet,
  createGoSnippet,
  createNodeJsSnippet,
  createPhpSnippet,
  createPythonSnippet,
} from '@/utils/code-snippets';
import { WorkflowOriginEnum } from '@/utils/enums';
import { capitalize } from '@/utils/string';
import type { WorkflowResponseDto } from '@novu/shared';
import { loadLanguage } from '@uiw/codemirror-extensions-langs';
import { useMemo, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { FaCode } from 'react-icons/fa6';
import { RiSendPlaneFill } from 'react-icons/ri';
import { Code2 } from '../../icons/code-2';
import { Button } from '../../primitives/button';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../primitives/form/form';
import { Input } from '../../primitives/input';
import { Panel, PanelContent, PanelHeader } from '../../primitives/panel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../primitives/tabs';
import { TestWorkflowFormType } from '../schema';
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
  const { control } = useFormContext<TestWorkflowFormType>();
  const [activeSnippetTab, setActiveSnippetTab] = useState<SnippetLanguage>(() =>
    workflow?.origin === WorkflowOriginEnum.EXTERNAL ? 'framework' : 'typescript'
  );
  const [showInstructions, setShowInstructions] = useState(false);
  const to = useWatch({ name: 'to', control });
  const payload = useWatch({ name: 'payload', control });
  const identifier = workflow?.workflowId ?? '';
  const snippetValue = useMemo(() => {
    const snippetUtil = LANGUAGE_TO_SNIPPET_UTIL[activeSnippetTab];
    return snippetUtil({ identifier, to, payload });
  }, [activeSnippetTab, identifier, to, payload]);

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
            <PanelContent className="flex flex-col overflow-hidden">
              <FormField
                control={control}
                name="payload"
                render={({ field: { ref: _ref, ...restField } }) => (
                  <FormItem className="flex flex-1 flex-col gap-2 overflow-auto">
                    <FormControl>
                      <>
                        <Editor
                          lang="json"
                          basicSetup={basicSetup}
                          extensions={extensions}
                          className="overflow-auto"
                          {...restField}
                          multiline
                        />
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
              <TabsList className="border-t-0" variant="regular">
                <TabsTrigger className={tabsTriggerClassName} value="typescript" variant="regular">
                  NodeJS
                </TabsTrigger>
                <TabsTrigger className={tabsTriggerClassName} value="shell" variant="regular">
                  cURL
                </TabsTrigger>
                <TabsTrigger className={tabsTriggerClassName} value="php" variant="regular">
                  PHP
                </TabsTrigger>
                <TabsTrigger className={tabsTriggerClassName} value="go" variant="regular">
                  Golang
                </TabsTrigger>
                <TabsTrigger className={tabsTriggerClassName} value="python" variant="regular">
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
              <TabsContent value="shell" className={codePanelClassName} variant="regular">
                <SnippetEditor language="shell" value={snippetValue} />
              </TabsContent>
              <TabsContent value="typescript" className={codePanelClassName} variant="regular">
                <SnippetEditor language="typescript" value={snippetValue} />
              </TabsContent>
              <TabsContent value="php" className={codePanelClassName} variant="regular">
                <SnippetEditor language="php" value={snippetValue} />
              </TabsContent>
              <TabsContent value="go" className={codePanelClassName} variant="regular">
                <SnippetEditor language="go" value={snippetValue} />
              </TabsContent>
              <TabsContent value="python" className={codePanelClassName} variant="regular">
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
