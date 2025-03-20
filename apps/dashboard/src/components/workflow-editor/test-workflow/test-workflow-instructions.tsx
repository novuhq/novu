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
import type { WorkflowResponseDto } from '@novu/shared';
import { motion } from 'motion/react';
import { useEffect } from 'react';
import { CodeBlock, Language } from '../../primitives/code-block';
import { InlineToast } from '../../primitives/inline-toast';
import { Separator } from '../../primitives/separator';
import { ExternalLink } from '../../shared/external-link';
import { SnippetLanguage } from './types';

interface TestWorkflowInstructionsProps {
  isOpen: boolean;
  onClose: () => void;
  workflow?: WorkflowResponseDto;
  to: Record<string, string>;
  payload: string;
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

function StepNumber({ index }: { index: number }) {
  return (
    <div className="text-label-xs text-text-strong bg-bg-weak flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
      {index + 1}
    </div>
  );
}

function TimelineLine() {
  return <div className="absolute left-3 top-6 h-[calc(100%+2rem)] w-[1px] -translate-x-1/2 bg-neutral-100" />;
}

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

function StepContent({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex-1">
      <div className="text-label-sm text-neutral-950">{title}</div>
      <div className="text-label-xs text-text-soft mt-2">{children}</div>
    </div>
  );
}

const stepAnimation = (index: number) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: index * 0.1 },
});

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
    <motion.div {...stepAnimation(index)} className="relative flex gap-6">
      <div className="relative">
        <StepNumber index={index} />
        <TimelineLine />
      </div>
      <StepContent title={title}>
        {children}
        {code && (
          <div className="mt-3">
            <CodeBlock code={code} language={codeLanguage} title={codeTitle} secretMask={secretMask} />
          </div>
        )}
      </StepContent>
    </motion.div>
  );
}

export function TestWorkflowInstructions({ isOpen, onClose, workflow, to, payload }: TestWorkflowInstructionsProps) {
  const identifier = workflow?.workflowId ?? '';
  const { data: apiKeysResponse } = useFetchApiKeys();
  const apiKey = apiKeysResponse?.data?.[0]?.key ?? '';
  const track = useTelemetry();

  useEffect(() => {
    if (isOpen) {
      track(TelemetryEvent.WORKFLOW_INSTRUCTIONS_OPENED);
    }
  }, [isOpen, track, identifier]);

  const getSnippetForLanguage = (language: SnippetLanguage) => {
    const snippetUtil = LANGUAGE_TO_SNIPPET_UTIL[language];
    return snippetUtil({ identifier, to, payload });
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
            <ExternalLink href="https://docs.novu.co/concepts/workflows">Learn more</ExternalLink>
          </SheetDescription>
        </SheetHeader>
        <Separator />
        <SheetMain className="p-0">
          <Tabs defaultValue="nodejs" className="w-full">
            <TabsList className="w-full" variant="regular">
              <TabsTrigger value="nodejs" variant="regular">
                NodeJS
              </TabsTrigger>
              <TabsTrigger value="shell" variant="regular">
                cURL
              </TabsTrigger>
              <TabsTrigger value="php" variant="regular">
                PHP
              </TabsTrigger>
              <TabsTrigger value="go" variant="regular">
                Golang
              </TabsTrigger>
              <TabsTrigger value="python" variant="regular">
                Python
              </TabsTrigger>
            </TabsList>

            <div className="mt-5 space-y-8 p-3">
              <TabsContent value="nodejs" className="space-y-8">
                <InstructionStep index={0} title="Install @novu/api" code="npm install @novu/api" codeTitle="Terminal">
                  The npm package to use with novu and node.js.
                </InstructionStep>

                <InstructionStep
                  index={1}
                  title="Copy API Keys to"
                  code={`NOVU_SECRET_KEY=${apiKey}`}
                  codeTitle=".env"
                  secretMask={[{ line: 1, maskStart, maskEnd }]}
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
              </TabsContent>

              <TabsContent value="shell" className="space-y-8">
                <InstructionStep
                  index={0}
                  title="Trigger from your terminal"
                  code={getSnippetForLanguage('shell')}
                  codeLanguage={SNIPPET_TO_CODE_LANGUAGE.shell}
                >
                  <TriggerStepContent />
                </InstructionStep>
              </TabsContent>

              <TabsContent value="php" className="space-y-8">
                <InstructionStep index={0} title="Install" code='composer require "novuhq/novu"' codeTitle="Terminal" />

                <InstructionStep
                  index={1}
                  title="Add the Secret Key to your .env file"
                  code={`# .env file
NOVU_SECRET_KEY='${apiKey}'`}
                  codeTitle=".env"
                  secretMask={[
                    { line: 2, maskStart, maskEnd },
                    { line: 5, maskStart: maskStart + 19, maskEnd: maskEnd + 19 },
                  ]}
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
              </TabsContent>

              <TabsContent value="python" className="space-y-8">
                <InstructionStep index={0} title="Install" code="pip install novu" codeTitle="Terminal" />

                <InstructionStep
                  index={1}
                  title="Copy API Keys to"
                  code={`NOVU_SECRET_KEY = '${apiKey}'`}
                  codeTitle=".env"
                  secretMask={[{ line: 1, maskStart, maskEnd }]}
                />

                <InstructionStep
                  index={2}
                  title="Add trigger code to your application"
                  code={getSnippetForLanguage('python')}
                  codeLanguage={SNIPPET_TO_CODE_LANGUAGE.python}
                >
                  <TriggerStepContent />
                </InstructionStep>
              </TabsContent>

              <TabsContent value="go" className="space-y-8">
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
                  secretMask={[{ line: 1, maskStart, maskEnd }]}
                />

                <InstructionStep
                  index={2}
                  title="Add trigger code to your application"
                  code={getSnippetForLanguage('go')}
                  codeLanguage={SNIPPET_TO_CODE_LANGUAGE.go}
                >
                  <TriggerStepContent />
                </InstructionStep>
              </TabsContent>
            </div>
          </Tabs>
        </SheetMain>
      </SheetContent>
    </Sheet>
  );
}
