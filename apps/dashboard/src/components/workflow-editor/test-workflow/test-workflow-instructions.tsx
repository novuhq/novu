import type { WorkflowResponseDto } from '@novu/shared';
import { PermissionsEnum } from '@novu/shared';
import { useEffect, useState } from 'react';
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
import { generateWorkflowTriggerAIPrompt, type PromptLanguage } from '@/utils/workflow-trigger-ai-prompt';
import { CodeBlock, Language } from '../../primitives/code-block';
import { InlineToast } from '../../primitives/inline-toast';
import { Separator } from '../../primitives/separator';
import { ToastClose, ToastIcon } from '../../primitives/sonner';
import { showErrorToast, showToast } from '../../primitives/sonner-helpers';
import { TimelineContainer, TimelineStep } from '../../primitives/timeline';
import { ExternalLink } from '../../shared/external-link';
import { SnippetLanguage } from './types';

interface TestWorkflowInstructionsProps {
  isOpen: boolean;
  onClose: () => void;
  workflow?: WorkflowResponseDto;
  to?: Record<string, string>;
  payload?: string | Record<string, unknown>;
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

const SNIPPET_TO_PROMPT_LANGUAGE: Record<SnippetLanguage, PromptLanguage> = {
  shell: 'shell',
  typescript: 'nodejs',
  php: 'php',
  go: 'go',
  python: 'python',
  framework: 'nodejs',
};

const PLACEHOLDER_API_KEY = 'API_KEY';

function TriggerStepContent() {
  return (
    <div className="space-y-3">
      <div className="text-foreground-400 text-xs">
        A trigger is the starting point of every workflow — an action or event that kicks it off. To initiate this, you
        call the Novu API using workflow_id.
      </div>
      <div className="text-foreground-400 text-xs">
        With the trigger, you can pass a custom payload object to the workflow, and use it in the workflow steps.
      </div>
      <InlineToast
        variant="tip"
        title="Tip"
        description="To create subscribers on the fly without the need for a migration, just pass an object with the subscriberId and the subscriber details like email, firstName, and lastName."
      />
    </div>
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
  const description = typeof children === 'string' ? children : undefined;
  const content = typeof children !== 'string' ? children : null;

  return (
    <TimelineStep index={index} title={title} description={description}>
      {content}
      {code && (
        <div className="mt-3 min-w-0">
          <CodeBlock code={code} language={codeLanguage} title={codeTitle} secretMask={secretMask} />
        </div>
      )}
    </TimelineStep>
  );
}

interface AIPromptTipProps {
  onCopy: () => void;
  isCopied: boolean;
}

function AIPromptTip({ onCopy, isCopied }: AIPromptTipProps) {
  return (
    <InlineToast
      variant="tip"
      title="Tip:"
      description="Use this pre-built prompt to get started faster."
      ctaLabel={isCopied ? 'Copied!' : 'Copy AI prompt'}
      onCtaClick={onCopy}
      ctaClassName="border-neutral-200 bg-white text-foreground-950 h-auto rounded border px-3 py-1.5 hover:bg-neutral-50"
      className="-mt-4 mb-3"
    />
  );
}

export function TestWorkflowInstructions({ isOpen, onClose, workflow, to, payload }: TestWorkflowInstructionsProps) {
  const identifier = workflow?.workflowId ?? '';
  const has = useHasPermission();
  const canReadApiKeys = has({ permission: PermissionsEnum.API_KEY_READ });

  const { data: apiKeysResponse } = useFetchApiKeys({ enabled: canReadApiKeys });
  const apiKey = canReadApiKeys ? (apiKeysResponse?.data?.[0]?.key ?? '') : PLACEHOLDER_API_KEY;
  const track = useTelemetry();

  const [isAIPromptCopied, setIsAIPromptCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<SnippetLanguage>('typescript');

  useEffect(() => {
    if (isOpen) {
      track(TelemetryEvent.WORKFLOW_INSTRUCTIONS_OPENED);
    }
  }, [isOpen, track]);

  useEffect(() => {
    if (isAIPromptCopied) {
      const timer = setTimeout(() => setIsAIPromptCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isAIPromptCopied]);

  const getSnippetForLanguage = (language: SnippetLanguage) => {
    const snippetUtil = LANGUAGE_TO_SNIPPET_UTIL[language];
    const secretKey = language === 'shell' && canReadApiKeys && apiKey ? apiKey : undefined;
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload ?? {}, null, 2);

    return snippetUtil({ identifier, to: to ?? {}, payload: payloadString, secretKey });
  };

  const getApiKeyMaskPositions = (key: string) => {
    if (!key) return { maskStart: 0, maskEnd: 0 };
    const lastFourStart = key.length - 4;
    return {
      maskStart: 'NOVU_SECRET_KEY='.length,
      maskEnd: 'NOVU_SECRET_KEY='.length + lastFourStart,
    };
  };

  const { maskStart, maskEnd } = getApiKeyMaskPositions(apiKey);

  const handleCopyAIPrompt = async () => {
    try {
      let parsedPayload: Record<string, unknown> = {};
      try {
        if (typeof payload === 'string') {
          parsedPayload = payload ? JSON.parse(payload) : {};
        } else {
          parsedPayload = payload ?? {};
        }
      } catch {
        parsedPayload = {};
      }

      const aiPrompt = generateWorkflowTriggerAIPrompt({
        workflowId: identifier,
        workflowName: workflow?.name ?? identifier,
        subscriberData: to ?? {},
        payload: parsedPayload,
        language: SNIPPET_TO_PROMPT_LANGUAGE[activeTab],
      });

      await navigator.clipboard.writeText(aiPrompt);
      setIsAIPromptCopied(true);

      track(TelemetryEvent.AI_PROMPT_COPIED, {
        workflowId: identifier,
        workflowName: workflow?.name,
        framework: activeTab,
        language: SNIPPET_TO_PROMPT_LANGUAGE[activeTab],
        context: 'workflow_instructions',
      });

      showToast({
        children: ({ close }) => (
          <>
            <ToastIcon variant="success" />
            <span>AI prompt copied to clipboard</span>
            <ToastClose onClick={close} />
          </>
        ),
        options: {
          position: 'bottom-right',
        },
      });
    } catch {
      showErrorToast('Failed to copy AI prompt');
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="flex w-full max-w-2xl flex-col">
        <SheetHeader className="shrink-0 space-y-initial px-6 py-4">
          <SheetTitle className="text-label-lg">Trigger workflow from your application</SheetTitle>
          <SheetDescription className="text-paragraph-xs text-text-soft mt-1 block">
            It's time to integrate the workflow with your application.{' '}
            <ExternalLink href="https://docs.novu.co/platform/concepts/workflows">Learn more</ExternalLink>
          </SheetDescription>
        </SheetHeader>
        <Separator className="shrink-0" />
        <SheetMain className="min-h-0 flex-1 overflow-y-auto p-0">
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as SnippetLanguage)}
            className="flex h-full flex-col"
          >
            <TabsList className="shrink-0 w-full overflow-x-auto px-6" variant="regular">
              <TabsTrigger value="typescript" variant="regular" size="xl">
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

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8">
              <TabsContent value="typescript" className="mt-0 min-w-0">
                <AIPromptTip onCopy={handleCopyAIPrompt} isCopied={isAIPromptCopied} />
                <TimelineContainer>
                  <InstructionStep
                    index={0}
                    title="Install @novu/api package"
                    code="npm install @novu/api"
                    codeTitle="Terminal"
                  >
                    Install the npm package to use with Novu and Node.js.
                  </InstructionStep>

                  <InstructionStep
                    index={1}
                    title="Add your API key to .env file"
                    code={`NOVU_SECRET_KEY=${apiKey}`}
                    codeTitle=".env"
                    secretMask={canReadApiKeys ? [{ line: 1, maskStart, maskEnd }] : undefined}
                  >
                    Use this key to authenticate your API requests. Keep it secure and never share it publicly.
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

              <TabsContent value="shell" className="mt-0 min-w-0">
                <AIPromptTip onCopy={handleCopyAIPrompt} isCopied={isAIPromptCopied} />
                <TimelineContainer>
                  <InstructionStep
                    index={0}
                    title="Set your API key as environment variable"
                    code={`export NOVU_SECRET_KEY=${apiKey}`}
                    codeTitle="Terminal"
                    secretMask={
                      canReadApiKeys
                        ? [
                            {
                              line: 1,
                              maskStart: 'export NOVU_SECRET_KEY='.length,
                              maskEnd: `export NOVU_SECRET_KEY=${apiKey}`.length - 4,
                            },
                          ]
                        : undefined
                    }
                  >
                    Use this key to authenticate your API requests. Keep it secure and never share it publicly.
                  </InstructionStep>

                  <InstructionStep
                    index={1}
                    title="Trigger workflow from your terminal"
                    code={getSnippetForLanguage('shell')}
                    codeLanguage={SNIPPET_TO_CODE_LANGUAGE.shell}
                    codeTitle="Terminal"
                  >
                    <TriggerStepContent />
                  </InstructionStep>
                </TimelineContainer>
              </TabsContent>

              <TabsContent value="php" className="mt-0 min-w-0">
                <AIPromptTip onCopy={handleCopyAIPrompt} isCopied={isAIPromptCopied} />
                <TimelineContainer>
                  <InstructionStep
                    index={0}
                    title="Install Novu PHP package"
                    code='composer require "novuhq/novu"'
                    codeTitle="Terminal"
                  >
                    Install the PHP package to use with Novu.
                  </InstructionStep>

                  <InstructionStep
                    index={1}
                    title="Add your API key to .env file"
                    code={`NOVU_SECRET_KEY=${apiKey}`}
                    codeTitle=".env"
                    secretMask={canReadApiKeys ? [{ line: 1, maskStart, maskEnd }] : undefined}
                  >
                    Use this key to authenticate your API requests. Keep it secure and never share it publicly.
                  </InstructionStep>

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

              <TabsContent value="python" className="mt-0 min-w-0">
                <AIPromptTip onCopy={handleCopyAIPrompt} isCopied={isAIPromptCopied} />
                <TimelineContainer>
                  <InstructionStep
                    index={0}
                    title="Install Novu Python package"
                    code="pip install novu"
                    codeTitle="Terminal"
                  >
                    Install the Python package to use with Novu.
                  </InstructionStep>

                  <InstructionStep
                    index={1}
                    title="Add your API key to .env file"
                    code={`NOVU_SECRET_KEY=${apiKey}`}
                    codeTitle=".env"
                    secretMask={canReadApiKeys ? [{ line: 1, maskStart, maskEnd }] : undefined}
                  >
                    Use this key to authenticate your API requests. Keep it secure and never share it publicly.
                  </InstructionStep>

                  <InstructionStep
                    index={2}
                    title="Add trigger code to your application"
                    code={getSnippetForLanguage('python')}
                    codeLanguage={SNIPPET_TO_CODE_LANGUAGE.python}
                    codeTitle="main.py"
                  >
                    <TriggerStepContent />
                  </InstructionStep>
                </TimelineContainer>
              </TabsContent>

              <TabsContent value="go" className="mt-0 min-w-0">
                <AIPromptTip onCopy={handleCopyAIPrompt} isCopied={isAIPromptCopied} />
                <TimelineContainer>
                  <InstructionStep
                    index={0}
                    title="Install Novu Go package"
                    code="go get github.com/novuhq/novu-go"
                    codeTitle="Terminal"
                  >
                    Install the Go package to use with Novu.
                  </InstructionStep>

                  <InstructionStep
                    index={1}
                    title="Add your API key to .env file"
                    code={`NOVU_SECRET_KEY=${apiKey}`}
                    codeTitle=".env"
                    secretMask={canReadApiKeys ? [{ line: 1, maskStart, maskEnd }] : undefined}
                  >
                    Use this key to authenticate your API requests. Keep it secure and never share it publicly.
                  </InstructionStep>

                  <InstructionStep
                    index={2}
                    title="Add trigger code to your application"
                    code={getSnippetForLanguage('go')}
                    codeLanguage={SNIPPET_TO_CODE_LANGUAGE.go}
                    codeTitle="main.go"
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
