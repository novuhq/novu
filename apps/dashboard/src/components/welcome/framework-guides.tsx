import { motion, AnimatePresence } from 'motion/react';
import { CodeBlock, Language } from '../primitives/code-block';
import { InlineToast } from '../primitives/inline-toast';
import { Framework, InstallationStep } from './framework-guides.instructions';

const fadeInAnimation = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
};

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
      className="absolute -left-[43px] flex h-5 w-5 items-center justify-center rounded-full bg-neutral-950"
    >
      <span className="text-xs font-medium text-white">{index + 1}</span>
    </motion.div>
  );
}

function StepContent({
  title,
  description,
  tip,
}: {
  title: string;
  description: string;
  tip?: InstallationStep['tip'];
}) {
  return (
    <div className="flex w-[344px] max-w-md flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{title}</span>
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
}: {
  code: string;
  language: Language;
  title?: string;
  index: number;
}) {
  return (
    <motion.div {...codeBlockAnimation(index)} className="w-full max-w-[500px]">
      <CodeBlock code={code} language={language === 'shell' ? 'shell' : language} title={title} />
    </motion.div>
  );
}

function InstallationStepRow({
  step,
  index,
  frameworkName,
}: {
  step: InstallationStep;
  index: number;
  frameworkName: string;
}) {
  return (
    <motion.div
      key={`${frameworkName}-step-${index}`}
      {...stepAnimation(index)}
      className="relative mt-8 flex gap-8 first:mt-0"
    >
      <StepNumber index={index} />
      <StepContent title={step.title} description={step.description} tip={step.tip} />
      {step.code && (
        <StepCodeBlock code={step.code} language={step.codeLanguage} title={step.codeTitle} index={index} />
      )}
    </motion.div>
  );
}

export function FrameworkInstructions({ framework }: { framework: Framework }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div key={framework.name} {...fadeInAnimation} className="flex flex-col gap-8 pl-[72px]">
        <div className="relative border-l border-[#eeeef0] p-8 pt-[24px]">
          {framework.installSteps.map((step, index) => (
            <InstallationStepRow
              key={`${framework.name}-step-${index}`}
              step={step}
              index={index}
              frameworkName={framework.name}
            />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
