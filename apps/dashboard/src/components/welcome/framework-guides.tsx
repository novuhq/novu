import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { fadeIn } from '@/utils/animation';
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
}: {
  title: string;
  description: string;
  tip?: InstallationStep['tip'];
  packageManager?: PackageManager;
  onPackageManagerChange?: (manager: PackageManager) => void;
  isInstallStep?: boolean;
}) {
  return (
    <div className="flex w-[344px] max-w-md flex-col gap-3">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">{title}</span>
        {isInstallStep && packageManager && onPackageManagerChange && (
          <Tabs
            defaultValue={packageManager}
            value={packageManager}
            onValueChange={(value) => onPackageManagerChange(value as PackageManager)}
          >
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
  const getCommand = (code: string) => {
    if (!packageManager || !code.includes('npx novu')) return code;

    switch (packageManager) {
      case 'pnpm':
        return code.replace('npx novu', 'pnpm dlx novu');
      case 'yarn':
        return code.replace('npx novu', 'yarn dlx novu');
      default:
        return code;
    }
  };

  return (
    <motion.div {...codeBlockAnimation(index)} className="w-full max-w-[500px]">
      <CodeBlock code={getCommand(code)} language={language === 'shell' ? 'shell' : language} title={title} />
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
}: {
  step: InstallationStep;
  index: number;
  frameworkName: string;
  packageManager?: PackageManager;
  onPackageManagerChange?: (manager: PackageManager) => void;
  showStepNumber?: boolean;
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
      {step.code && (
        <StepCodeBlock
          code={step.code}
          language={step.codeLanguage}
          title={step.codeTitle}
          index={index}
          packageManager={packageManager}
        />
      )}
    </motion.div>
  );
}

export function FrameworkInstructions({ framework }: { framework: Framework }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div key={framework.name} {...fadeIn} className="flex flex-col gap-7 pl-12">
        <div className="relative border-l border-[#eeeef0] p-8 pt-[24px]">
          {framework.installSteps.map((step, index) => (
            <InstallationStepRow
              key={`${framework.name}-step-${index}`}
              step={step}
              index={index}
              frameworkName={framework.name}
              showStepNumber={true}
            />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export function FrameworkCliInstructions({ framework }: { framework: Framework }) {
  const [packageManager, setPackageManager] = useState<PackageManager>('npm');

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={framework.name} {...fadeIn} className="flex flex-col gap-7 pl-12">
        <div className="relative border-l border-[#eeeef0] p-8 pt-[24px]">
          {framework.installSteps.map((step, index) => (
            <InstallationStepRow
              key={`${framework.name}-step-${index}`}
              step={step}
              index={index}
              frameworkName={framework.name}
              packageManager={packageManager}
              onPackageManagerChange={setPackageManager}
              showStepNumber={false}
            />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
