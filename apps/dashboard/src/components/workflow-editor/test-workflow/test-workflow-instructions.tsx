import type { WorkflowResponseDto } from '@novu/shared';
import { PermissionsEnum } from '@novu/shared';
import { useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetMain,
  SheetTitle,
} from '@/components/primitives/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/primitives/tabs';
import { useFetchApiKeys } from '@/hooks/use-fetch-api-keys';
import { useHasPermission } from '@/hooks/use-has-permission';
import { useTelemetry } from '@/hooks/use-telemetry';
import {
  type CodeSnippet,
  createCurlSnippet,
  createFrameworkSnippet,
  createGoSnippet,
  createNodeJsSnippet,
  createPhpSnippet,
  createPythonSnippet,
} from '@/utils/code-snippets';
import { TelemetryEvent } from '@/utils/telemetry';
import { CodeBlock, Language } from '../../primitives/code-block';
import { InlineToast } from '../../primitives/inline-toast';
import { Separator } from '../../primitives/separator';
import { TimelineContainer, TimelineStep } from '../../primitives/timeline';
import { ExternalLink } from '../../shared/external-link';
import { SnippetLanguage } from './types';

interface TestWorkflowInstructionsProps {
  isOpen: boolean;
  onClose: () => void;
  workflow?: WorkflowResponseDto;
  to?: Record<string, string>;
  payload?: string;
}

const LANGUAGE_TO_SNIPPET_UTIL: Record<SnippetLanguage, (props: CodeSnippet) => string> = {
  shell: createCurlSnippet,
  typescript: createNodeJsSnippet,
  php: createPhpSnippet,
  go: createGoSnippet,
  python: createPythonSnippet,
  framework: createFrameworkSnippet,
};

const SNIPPET_TO_CODE_LANGUAGE: Record<SnippetLanguage, Language> = {
  shell: 'shell',
  typescript: 'typescript',
  php: 'php',
  go: 'go',
  python: 'python',
  framework: 'typescript',
};

function TriggerStepContent() {
  return (
    <>
      <div className="text-foreground-400 mb-3 text-xs">
        A trigger is the starting point of every workflow — an action or event that kicks it off. To initiate this, you
        call the Novu API using workflow_id.
      </div>
      <div className="text-foreground-400 mb-3 text-xs">
        With the trigger, you can pass a custom payload object to the workflow, and use it in the workflow steps.
      </div>
      <InlineToast
        variant="tip"
        title="Tip"
        description="To create subscribers on the fly without the need for a migration, just pass an object with the subscriberId and the subscriber details like email, firstName, and lastName."
      />
    </>
  );
}

interface InstructionStepProps {
  index: number;
  title: string;
  children?: React.ReactNode;
  code?: string;
  codeTitle?: string;
  codeLanguage?: Language;
  tip?: { title: string; description: string };
  secretMask?: {
    line: number;
    maskStart?: number;
    maskEnd?: number;
  }[];
}

function InstructionStep({
  index,
  title,
  children,
  code,
  codeTitle,
  codeLanguage = 'shell',
  secretMask,
}: InstructionStepProps) {
  return (
    <TimelineStep index={index} title={title} description={children as string}>
      {code && (
        <div className="mt-3">
          <CodeBlock code={code} language={codeLanguage} title={codeTitle} secretMask={secretMask} />
        </div>
      )}
    </TimelineStep>
  );
}

export function TestWorkflowInstructions({ isOpen, onClose, workflow, to, payload }: TestWorkflowInstructionsProps) {
  const identifier = workflow?.workflowId ?? '';
  const has = useHasPermission();
  const canReadApiKeys = has({ permission: PermissionsEnum.API_KEY_READ });

  const { data: apiKeysResponse } = useFetchApiKeys({ enabled: canReadApiKeys });
  const apiKey = canReadApiKeys ? (apiKeysResponse?.data?.[0]?.key ?? '') : 'API_KEY';
  const track = useTelemetry();

  useEffect(() => {
    if (isOpen) {
      track(TelemetryEvent.WORKFLOW_INSTRUCTIONS_OPENED);
    }
  }, [isOpen, track, identifier]);

  const getSnippetForLanguage = (language: SnippetLanguage) => {
    const snippetUtil = LANGUAGE_TO_SNIPPET_UTIL[language];

    return snippetUtil({ identifier, to: to ?? {}, payload: payload ?? '' });
  };

  // Calculate the positions to mask the API key, showing only last 4 characters
  const getApiKeyMaskPositions = (key: string) => {
    if (!key) return { maskStart: 0, maskEnd: 0 };
    const lastFourStart = key.length - 4;
    return {
      maskStart: 'NOVU_SECRET_KEY='.length,
      maskEnd: 'NOVU_SECRET_KEY='.length + lastFourStart,
    };
  };

  const { maskStart, maskEnd } = getApiKeyMaskPositions(apiKey);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="min-w-[500px]">
        <SheetHeader className="space-y-initial p-3 py-4">
          <SheetTitle className="text-label-lg">Trigger workflow from your application</SheetTitle>
          <SheetDescription className="text-paragraph-xs text-text-soft mt-1 block">
            It's time to integrate the workflow with your application.{' '}
            <ExternalLink href="https://docs.novu.co/platform/concepts/workflows">Learn more</ExternalLink>
          </SheetDescription>
        </SheetHeader>
        <Separator />
        <SheetMain className="p-0">
          <Tabs defaultValue="nodejs" className="w-full">
            <TabsList className="w-full" variant="regular">
              <TabsTrigger value="nodejs" variant="regular" size="xl">
                NodeJS
              </TabsTrigger>
              <TabsTrigger value="shell" variant="regular" size="xl">
                cURL
              </TabsTrigger>
              <TabsTrigger value="php" variant="regular" size="xl">
                PHP
              </TabsTrigger>
              <TabsTrigger value="go" variant="regular" size="xl">
                Golang
              </TabsTrigger>
              <TabsTrigger value="python" variant="regular" size="xl">
                Python
              </TabsTrigger>
            </TabsList>

            <div className="mt-5 p-3">
              <TabsContent value="nodejs">
                <TimelineContainer>
                  <InstructionStep
                    index={0}
                    title="Install @novu/api"
                    code="npm install @novu/api"
                    codeTitle="Terminal"
                  >
                    The npm package to use with novu and node.js.
                  </InstructionStep>

                  <InstructionStep
                    index={1}
                    title="Copy API Keys to"
                    code={`NOVU_SECRET_KEY=${apiKey}`}
                    codeTitle=".env"
                    secretMask={canReadApiKeys ? [{ line: 1, maskStart, maskEnd }] : undefined}
                  >
                    Use this key to authenticate your API requests. Keep it secure and never share it publicly.{' '}
                  </InstructionStep>

                  <InstructionStep
                    index={2}
                    title="Add trigger code to your application"
                    code={getSnippetForLanguage('typescript')}
                    codeLanguage={SNIPPET_TO_CODE_LANGUAGE.typescript}
                    codeTitle="index.ts"
                  >
                    <TriggerStepContent />
                  </InstructionStep>
                </TimelineContainer>
              </TabsContent>

              <TabsContent value="shell">
                <TimelineContainer>
                  <InstructionStep
                    index={0}
                    title="Trigger from your terminal"
                    code={getSnippetForLanguage('shell')}
                    codeLanguage={SNIPPET_TO_CODE_LANGUAGE.shell}
                  >
                    <TriggerStepContent />
                  </InstructionStep>
                </TimelineContainer>
              </TabsContent>

              <TabsContent value="php">
                <TimelineContainer>
                  <InstructionStep
                    index={0}
                    title="Install"
                    code='composer require "novuhq/novu"'
                    codeTitle="Terminal"
                  />

                  <InstructionStep
                    index={1}
                    title="Add the Secret Key to your .env file"
                    code={`# .env file
NOVU_SECRET_KEY='${apiKey}'`}
                    codeTitle=".env"
                    secretMask={canReadApiKeys ? [{ line: 2, maskStart, maskEnd }] : undefined}
                  />

                  <InstructionStep
                    index={2}
                    title="Add trigger code to your application"
                    code={getSnippetForLanguage('php')}
                    codeTitle="index.php"
                    codeLanguage={SNIPPET_TO_CODE_LANGUAGE.php}
                  >
                    <TriggerStepContent />
                  </InstructionStep>
                </TimelineContainer>
              </TabsContent>

              <TabsContent value="python">
                <TimelineContainer>
                  <InstructionStep index={0} title="Install" code="pip install novu" codeTitle="Terminal" />

                  <InstructionStep
                    index={1}
                    title="Copy API Keys to"
                    code={`NOVU_SECRET_KEY = '${apiKey}'`}
                    codeTitle=".env"
                    secretMask={canReadApiKeys ? [{ line: 1, maskStart, maskEnd }] : undefined}
                  />

                  <InstructionStep
                    index={2}
                    title="Add trigger code to your application"
                    code={getSnippetForLanguage('python')}
                    codeLanguage={SNIPPET_TO_CODE_LANGUAGE.python}
                  >
                    <TriggerStepContent />
                  </InstructionStep>
                </TimelineContainer>
              </TabsContent>

              <TabsContent value="go">
                <TimelineContainer>
                  <InstructionStep
                    index={0}
                    title="Install"
                    code="go get github.com/novuhq/novu-go"
                    codeTitle="Terminal"
                  />

                  <InstructionStep
                    index={1}
                    title="Copy API Keys to"
                    code={`NOVU_SECRET_KEY = '${apiKey}'`}
                    codeTitle=".env"
                    secretMask={canReadApiKeys ? [{ line: 1, maskStart, maskEnd }] : undefined}
                  />

                  <InstructionStep
                    index={2}
                    title="Add trigger code to your application"
                    code={getSnippetForLanguage('go')}
                    codeLanguage={SNIPPET_TO_CODE_LANGUAGE.go}
                  >
                    <TriggerStepContent />
                  </InstructionStep>
                </TimelineContainer>
              </TabsContent>
            </div>
          </Tabs>
        </SheetMain>
      </SheetContent>
    </Sheet>
  );
}
