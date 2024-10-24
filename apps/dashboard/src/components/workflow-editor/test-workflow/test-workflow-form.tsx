import { useMemo, useState } from 'react';
import { RiSendPlaneFill } from 'react-icons/ri';
import { useFormContext, useWatch } from 'react-hook-form';
import { Editor } from '@monaco-editor/react';
import type { WorkflowResponseDto } from '@novu/shared';
import { Code2 } from '../../icons/code-2';
import { Panel, PanelContent, PanelHeader } from '../../primitives/panel';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../primitives/form/form';
import { Input, InputField } from '../../primitives/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../primitives/tabs';
import { capitalize } from '@/utils/string';
import {
  type CodeSnippet,
  createCurlSnippet,
  createFrameworkSnippet,
  createGoSnippet,
  createNodeJsSnippet,
  createPhpSnippet,
  createPythonSnippet,
} from '@/utils/code-snippets';
import { CopyButton } from '../../primitives/copy-button';
import { TestWorkflowFormType } from '../schema';

const tabsTriggerClassName = 'pt-1';
const codePanelClassName = 'bg-background h-full w-full rounded-lg border border-neutral-200 p-3';

type SnippetLanguage = 'shell' | 'framework' | 'typescript' | 'php' | 'go' | 'python';

const LANGUAGE_TO_SNIPPET_UTIL: Record<SnippetLanguage, (props: CodeSnippet) => string> = {
  shell: createCurlSnippet,
  framework: createFrameworkSnippet,
  typescript: createNodeJsSnippet,
  php: createPhpSnippet,
  go: createGoSnippet,
  python: createPythonSnippet,
};

const SnippetEditor = ({ language, value }: { language: SnippetLanguage; value: string }) => {
  const editorLanguage = language === 'framework' ? 'typescript' : language;

  return (
    <Editor
      defaultLanguage={editorLanguage}
      language={editorLanguage}
      className="h-full"
      options={{
        minimap: {
          enabled: false,
        },
        // workaround from: https://github.com/microsoft/monaco-editor/issues/2093
        accessibilitySupport: 'off',
        renderLineHighlight: 'none',
        scrollBeyondLastLine: false,
        fontSize: 14,
        lineHeight: 20,
        readOnly: true,
      }}
      value={value}
    />
  );
};

export const TestWorkflowForm = ({ workflow }: { workflow?: WorkflowResponseDto }) => {
  const {
    control,
    formState: { errors },
  } = useFormContext<TestWorkflowFormType>();
  const [activeSnippetTab, setActiveSnippetTab] = useState<SnippetLanguage>('framework');
  const to = useWatch({ name: 'to', control });
  const payload = useWatch({ name: 'payload', control });
  const identifier = workflow?.workflowId ?? '';
  const snippetValue = useMemo(() => {
    const snippetUtil = LANGUAGE_TO_SNIPPET_UTIL[activeSnippetTab];
    return snippetUtil({ identifier, to, payload });
  }, [activeSnippetTab, identifier, to, payload]);

  return (
    <div className="flex h-full w-full flex-1 flex-col gap-3 p-3">
      <div className="flex flex-1 flex-col gap-3 xl:flex-row">
        <div className="flex-1">
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
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor={key}>{capitalize(key)}</FormLabel>
                      <FormControl>
                        <InputField state={errors.to?.[key] ? 'error' : 'default'}>
                          <Input id={key} {...(field as any)} />
                        </InputField>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </PanelContent>
          </Panel>
        </div>
        <div className="flex-[2_2_0%]">
          <FormField
            control={control}
            name="payload"
            render={({ field: { ref: _ref, ...restField } }) => (
              <FormItem className="h-full">
                <FormControl>
                  <Panel className="h-full">
                    <PanelHeader>
                      <Code2 className="size-5" />
                      <span className="text-neutral-950">Payload</span>
                    </PanelHeader>
                    <PanelContent>
                      <Editor
                        defaultLanguage="json"
                        language="json"
                        className="h-full"
                        options={{
                          minimap: {
                            enabled: false,
                          },
                          // workaround from: https://github.com/microsoft/monaco-editor/issues/2093
                          accessibilitySupport: 'off',
                          renderLineHighlight: 'none',
                          scrollBeyondLastLine: false,
                          fontSize: 14,
                          lineHeight: 20,
                          readOnly: false,
                        }}
                        {...restField}
                      />
                    </PanelContent>
                    <FormMessage />
                  </Panel>
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </div>
      <div className="flex-1">
        <Panel className="h-full">
          <Tabs
            className="flex h-full flex-1 flex-col border-none"
            value={activeSnippetTab}
            onValueChange={(value) => setActiveSnippetTab(value as SnippetLanguage)}
          >
            <TabsList className="border-t-0">
              <TabsTrigger className={tabsTriggerClassName} value="framework">
                Framework
              </TabsTrigger>
              <TabsTrigger className={tabsTriggerClassName} value="shell">
                cURL
              </TabsTrigger>
              <TabsTrigger className={tabsTriggerClassName} value="typescript">
                NodeJS
              </TabsTrigger>
              <TabsTrigger className={tabsTriggerClassName} value="php">
                PHP
              </TabsTrigger>
              <TabsTrigger className={tabsTriggerClassName} value="go">
                Golang
              </TabsTrigger>
              <TabsTrigger className={tabsTriggerClassName} value="python">
                Python
              </TabsTrigger>
              <CopyButton
                variant="ghost"
                size="sm"
                className="text-foreground-400 ml-auto font-normal"
                content={snippetValue}
                value="Copy code"
              />
            </TabsList>
            <TabsContent value="framework" className={codePanelClassName}>
              <SnippetEditor language="framework" value={snippetValue} />
            </TabsContent>
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
  );
};
