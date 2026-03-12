import { motion } from 'motion/react';
import { useState } from 'react';
import { RiCursorLine, RiSparklingLine } from 'react-icons/ri';
import { useTelemetry } from '../../hooks/use-telemetry';
import { TelemetryEvent } from '../../utils/telemetry';
import { CodeBlock, Language } from '../primitives/code-block';
import { InlineToast } from '../primitives/inline-toast';
import { Tabs, TabsList, TabsTrigger } from '../primitives/tabs';
import { Framework, InstallationStep } from './framework-guides.instructions';

type PackageManager = 'npm' | 'pnpm' | 'yarn';

const stepAnimation = (index: number) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: {
    duration: 0.3,
    delay: index * 0.15,
    ease: 'easeOut',
  },
});

const numberAnimation = (index: number) => ({
  initial: { scale: 0, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  transition: {
    duration: 0.2,
    delay: index * 0.15 + 0.1,
    ease: 'easeOut',
  },
});

const codeBlockAnimation = (index: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: {
    duration: 0.3,
    delay: index * 0.15 + 0.2,
    ease: 'easeOut',
  },
});

function StepNumber({ index }: { index: number }) {
  return (
    <motion.div
      {...numberAnimation(index)}
      className="absolute -left-[47px] flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 p-[2px]"
    >
      <div className="flex h-full w-full items-center justify-center rounded-full bg-neutral-100">
        <span className="text-sm font-medium text-neutral-950">{index + 1}</span>
      </div>
    </motion.div>
  );
}

function StepContent({
  title,
  description,
  tip,
  packageManager,
  onPackageManagerChange,
  isInstallStep,
  extra,
}: {
  title: string;
  description: string;
  tip?: InstallationStep['tip'];
  packageManager?: PackageManager;
  onPackageManagerChange?: (manager: PackageManager) => void;
  isInstallStep?: boolean;
  extra?: React.ReactNode;
}) {
  const track = useTelemetry();

  const handlePackageManagerChange = (value: string) => {
    track(TelemetryEvent.INBOX_CUSTOMIZATION_CHANGED, { packageManager: value });
    onPackageManagerChange?.(value as PackageManager);
  };

  return (
    <div className="flex w-[344px] max-w-md flex-col gap-3">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">{title}</span>
        {isInstallStep && packageManager && onPackageManagerChange && (
          <Tabs defaultValue={packageManager} value={packageManager} onValueChange={handlePackageManagerChange}>
            <TabsList className="inline-flex items-center gap-2 bg-transparent p-0">
              <TabsTrigger
                value="npm"
                className="relative text-xs font-medium text-[#525866] transition-colors hover:text-[#dd2476] data-[state=active]:text-[#dd2476]"
              >
                npm
              </TabsTrigger>
              <TabsTrigger
                value="yarn"
                className="relative text-xs font-medium text-[#525866] transition-colors hover:text-[#dd2476] data-[state=active]:text-[#dd2476]"
              >
                yarn
              </TabsTrigger>
              <TabsTrigger
                value="pnpm"
                className="relative text-xs font-medium text-[#525866] transition-colors hover:text-[#dd2476] data-[state=active]:text-[#dd2476]"
              >
                pnpm
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>
      <p className="text-foreground-400 text-xs">{description}</p>
      {tip && <InlineToast variant="tip" title={tip.title} description={tip.description} />}
      {extra && <div className="mt-2">{extra}</div>}
    </div>
  );
}

function StepCodeBlock({
  code,
  language,
  title,
  index,
  packageManager,
}: {
  code: string;
  language: Language;
  title?: string;
  index: number;
  packageManager?: PackageManager;
}) {
  const track = useTelemetry();

  const getCommand = (code: string) => {
    if (!packageManager) return code;

    if (code.includes('npx add-inbox@latest')) {
      switch (packageManager) {
        case 'pnpm':
          return code.replace('npx add-inbox@latest', 'pnpm dlx add-inbox@latest');
        case 'yarn':
          return code.replace('npx add-inbox@latest', 'yarn dlx add-inbox@latest');
        default:
          return code;
      }
    }

    if (code.includes('npx novu')) {
      switch (packageManager) {
        case 'pnpm':
          return code.replace('npx novu', 'pnpm dlx novu');
        case 'yarn':
          return code.replace('npx novu', 'yarn dlx novu');
        default:
          return code;
      }
    }

    return code;
  };

  const handleCodeCopy = () => {
    track(TelemetryEvent.AI_PROMPT_COPIED, { type: 'code_snippet' });
  };

  return (
    <motion.div {...codeBlockAnimation(index)} className="w-full max-w-[500px]">
      <CodeBlock
        code={getCommand(code)}
        language={language === 'shell' ? 'shell' : language}
        title={title}
        actionButtons={
          <div className="flex items-center gap-1">
            <button
              onClick={handleCodeCopy}
              className="rounded-md p-2 transition-all duration-200 active:scale-95 text-foreground-400 hover:text-foreground-50 hover:bg-[#32424a]"
              title="Copy code"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </button>
          </div>
        }
      />
    </motion.div>
  );
}

const FRAMEWORK_PACKAGES: Record<string, string> = {
  'Next.js': '@novu/nextjs',
  React: '@novu/react',
  Remix: '@novu/react',
  Native: '@novu/react-native',
  Angular: '@novu/js',
  JavaScript: '@novu/js',
};

const FRAMEWORK_DOCS: Record<string, string> = {
  'Next.js': 'https://docs.novu.co/platform/quickstart/nextjs',
  React: 'https://docs.novu.co/platform/quickstart/react',
  Remix: 'https://docs.novu.co/platform/quickstart/remix',
  Native: 'https://docs.novu.co/platform/quickstart/react-native',
  Angular: 'https://docs.novu.co/platform/quickstart/angular',
  JavaScript: 'https://docs.novu.co/platform/quickstart/js',
};

function buildCondensedPrompt(frameworkName: string, applicationIdentifier: string, subscriberId: string): string {
  const pkg = FRAMEWORK_PACKAGES[frameworkName] ?? '@novu/js';
  const docs = FRAMEWORK_DOCS[frameworkName] ?? 'https://docs.novu.co';

  return `Integrate the Novu Inbox notification component into my ${frameworkName} app.

Install ${pkg} and add the <Inbox /> component to my header or navbar.

Configuration:
- applicationIdentifier: "${applicationIdentifier}"
- subscriberId: "${subscriberId}"

Requirements:
- Detect my project's package manager, auth system, and UI framework
- Extract design tokens from my app and apply via the appearance prop (variables and elements)
- Place <Inbox /> inline in existing UI — no wrappers or new pages
- Use TypeScript, no comments, no empty props
- Follow ${frameworkName} best practices

Docs: ${docs}`;
}

function buildCursorDeepLink(frameworkName: string, applicationIdentifier: string, subscriberId: string): string {
  const prompt = buildCondensedPrompt(frameworkName, applicationIdentifier, subscriberId);
  const url = new URL('cursor://anysphere.cursor-deeplink/prompt');
  url.searchParams.set('text', prompt);

  return url.toString();
}

function extractConfigFromPrompt(copyText: string): { applicationIdentifier: string; subscriberId: string } {
  const appIdMatch = copyText.match(/NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER=(\S+)/);
  const subIdMatch = copyText.match(/subscriberId="([^"]+)"/);

  return {
    applicationIdentifier: appIdMatch?.[1] ?? 'YOUR_APPLICATION_IDENTIFIER',
    subscriberId: subIdMatch?.[1] ?? 'YOUR_SUBSCRIBER_ID',
  };
}

function StepButton({
  buttonText,
  copyText,
  index,
  frameworkName,
}: {
  buttonText: string;
  copyText: string;
  index: number;
  frameworkName?: string;
}) {
  const [copied, setCopied] = useState(false);
  const track = useTelemetry();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      track(TelemetryEvent.AI_PROMPT_COPIED, { framework: frameworkName });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const { applicationIdentifier, subscriberId } = extractConfigFromPrompt(copyText);
  const cursorDeepLink = buildCursorDeepLink(frameworkName ?? 'Next.js', applicationIdentifier, subscriberId);

  return (
    <motion.div {...codeBlockAnimation(index)} className="w-full max-w-[500px]">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="relative flex flex-row justify-center items-center gap-1 w-[126px] h-7 text-white font-medium text-xs leading-4"
            style={{
              boxSizing: 'border-box',
              padding: '6px 4px 6px 6px',
              background: copied
                ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0.12) 100%), #151A22'
                : 'linear-gradient(180deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0) 100%), #0E121B',
              boxShadow: '0px 1px 2px rgba(27, 28, 29, 0.48), 0px 0px 0px 1px #242628',
              borderRadius: '8px',
              fontFamily: 'Inter',
              fontWeight: 500,
              fontSize: '12px',
              lineHeight: '16px',
              fontFeatureSettings: "'cv09' on, 'ss11' on, 'calt' off, 'liga' off",
              transition: 'background 150ms ease, box-shadow 150ms ease',
            }}
          >
            <div
              className={`${copied ? 'opacity-0' : 'opacity-100'} flex flex-row items-center gap-1 transition-opacity`}
              aria-hidden={copied}
            >
              <RiSparklingLine className="w-3.5 h-3.5 flex-none order-0" />
              <span className="px-1 w-[98px] h-4 flex flex-row justify-center items-center flex-none order-1">
                <span className="w-[90px] h-4 flex items-center flex-none order-0">{buttonText}</span>
              </span>
            </div>
            <div
              className={`absolute inset-0 flex items-center justify-center transition-opacity ${copied ? 'opacity-100' : 'opacity-0'}`}
            >
              Copied!
            </div>
          </button>
          <a
            href={cursorDeepLink}
            onClick={() => track(TelemetryEvent.AI_PROMPT_COPIED, { framework: frameworkName, method: 'cursor-deeplink' })}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 h-7 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 hover:border-neutral-300"
          >
            <RiCursorLine className="size-3.5" />
            Open in Cursor
          </a>
        </div>
        <p className="text-foreground-400 text-xs">(No terminal, no docs — just let your pair programmer handle it.)</p>
      </div>
    </motion.div>
  );
}

function InstallationStepRow({
  step,
  index,
  frameworkName,
  packageManager,
  onPackageManagerChange,
  showStepNumber = true,
  rightExtra,
  hideCopyButton,
}: {
  step: InstallationStep;
  index: number;
  frameworkName: string;
  packageManager?: PackageManager;
  onPackageManagerChange?: (manager: PackageManager) => void;
  showStepNumber?: boolean;
  rightExtra?: React.ReactNode;
  hideCopyButton?: boolean;
}) {
  const isInstallStep = step.title.toLowerCase().includes('install');

  return (
    <motion.div
      key={`${frameworkName}-step-${index}`}
      {...stepAnimation(index)}
      className="relative mt-8 flex gap-8 first:mt-0"
    >
      {showStepNumber && <StepNumber index={index} />}
      <StepContent
        title={step.title}
        description={step.description}
        tip={step.tip}
        packageManager={packageManager}
        onPackageManagerChange={onPackageManagerChange}
        isInstallStep={isInstallStep}
      />
      {step.code ? (
        <div className="flex w-full max-w-[500px] flex-col gap-2">
          <StepCodeBlock
            code={step.code}
            language={step.codeLanguage}
            title={step.codeTitle}
            index={index}
            packageManager={packageManager}
          />
          {rightExtra}
        </div>
      ) : step.buttonText && step.copyText && !hideCopyButton ? (
        <div className="flex w-full max-w-[500px] flex-col gap-2">
          <StepButton
            buttonText={step.buttonText}
            copyText={step.copyText}
            index={index}
            frameworkName={frameworkName}
          />
          {rightExtra}
        </div>
      ) : (
        rightExtra
      )}
    </motion.div>
  );
}

function InstallationStepsList({
  framework,
  showStepNumbers,
  packageManager,
  onPackageManagerChange,
  hideCopyButton,
}: {
  framework: Framework;
  showStepNumbers: boolean;
  packageManager?: PackageManager;
  onPackageManagerChange?: (manager: PackageManager) => void;
  hideCopyButton?: boolean;
}) {
  return (
    <>
      {framework.installSteps.map((step, index) => (
        <InstallationStepRow
          key={`${framework.name}-step-${index}`}
          step={step}
          index={index}
          frameworkName={framework.name}
          packageManager={packageManager}
          onPackageManagerChange={onPackageManagerChange}
          showStepNumber={showStepNumbers}
          hideCopyButton={hideCopyButton}
        />
      ))}
    </>
  );
}

export function FrameworkInstructions({
  framework,
  hideCopyButton,
}: {
  framework: Framework;
  hideCopyButton?: boolean;
}) {
  const showNumbers = framework.installSteps.length > 1;

  return (
    <motion.div
      key={framework.name}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0 } }}
      transition={{ duration: 0.12 }}
      className="flex flex-col gap-7 pl-12"
    >
      <div className="relative border-l border-[#eeeef0] p-8 pt-[12px] pb-12">
        <InstallationStepsList framework={framework} showStepNumbers={showNumbers} hideCopyButton={hideCopyButton} />
      </div>
    </motion.div>
  );
}

export function FrameworkCliInstructions({ framework }: { framework: Framework }) {
  const [packageManager, setPackageManager] = useState<PackageManager>('npm');

  const showNumbers = framework.installSteps.length > 1;

  return (
    <motion.div
      key={framework.name}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0 } }}
      transition={{ duration: 0.12 }}
      className="flex flex-col gap-7 pl-12"
    >
      <div className="relative border-l border-[#eeeef0] p-8 pt-[12px] pb-12">
        <InstallationStepsList
          framework={framework}
          showStepNumbers={showNumbers}
          packageManager={packageManager}
          onPackageManagerChange={setPackageManager}
        />
      </div>
    </motion.div>
  );
}
