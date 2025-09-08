import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fadeIn } from '@/utils/animation';
import { useTelemetry } from '../../hooks/use-telemetry';
import { buildRoute, ROUTES } from '../../utils/routes';
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

function SetupTooltip({ onInviteTeam, onSkip }: { onInviteTeam: () => void; onSkip: () => void }) {
  return (
    <InlineToast
      variant="tip"
      className="w-fit"
      description={
        <div className="flex items-center gap-2">
          <span>Not ready?</span>
          <button type="button" className="text-[#525866] text-xs font-medium" onClick={onInviteTeam}>
            Invite team
          </button>
          <span>or</span>
          <button type="button" className="text-[#525866] text-xs font-medium" onClick={onSkip}>
            Skip for now
          </button>
        </div>
      }
    />
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
  rightExtra,
  leftExtra,
}: {
  step: InstallationStep;
  index: number;
  frameworkName: string;
  packageManager?: PackageManager;
  onPackageManagerChange?: (manager: PackageManager) => void;
  showStepNumber?: boolean;
  rightExtra?: React.ReactNode;
  leftExtra?: React.ReactNode;
}) {
  const isInstallStep = step.title.toLowerCase().includes('install');
  let manualTooltipTopClass = 'top-36';
  if (frameworkName === 'Native') {
    manualTooltipTopClass = 'top-16';
  } else if (frameworkName === 'JavaScript') {
    manualTooltipTopClass = 'top-40';
  }

  return (
    <motion.div
      key={`${frameworkName}-step-${index}`}
      {...stepAnimation(index)}
      className="relative mt-8 flex gap-8 first:mt-0"
    >
      {showStepNumber && <StepNumber index={index} />}
      {showStepNumber && leftExtra && (
        <div className={`absolute -left-[80px] ${manualTooltipTopClass}`}>{leftExtra}</div>
      )}
      <StepContent
        title={step.title}
        description={step.description}
        tip={step.tip}
        packageManager={packageManager}
        onPackageManagerChange={onPackageManagerChange}
        isInstallStep={isInstallStep}
        extra={!showStepNumber && leftExtra ? <div className="-ml-20">{leftExtra}</div> : undefined}
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
  renderTooltip,
}: {
  framework: Framework;
  showStepNumbers: boolean;
  packageManager?: PackageManager;
  onPackageManagerChange?: (manager: PackageManager) => void;
  renderTooltip: () => JSX.Element;
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
          leftExtra={index === framework.installSteps.length - 1 ? renderTooltip() : undefined}
        />
      ))}
    </>
  );
}

export function FrameworkInstructions({ framework }: { framework: Framework }) {
  const track = useTelemetry();
  const navigate = useNavigate();
  const { environmentSlug } = useParams();

  const renderTooltip = () => (
    <SetupTooltip
      onInviteTeam={() => {
        track(TelemetryEvent.INVITE_TEAM_CLICKED, { origin: 'manual' });
        navigate(buildRoute(ROUTES.SETTINGS_TEAM, { environmentSlug: environmentSlug || '' }));
      }}
      onSkip={() => {
        track(TelemetryEvent.SKIP_ONBOARDING_CLICKED, {
          skippedFrom: 'framework-guides-manual',
        });
        navigate(buildRoute(ROUTES.HOME, { environmentSlug: environmentSlug || '' }));
      }}
    />
  );

  return (
    <AnimatePresence mode="wait">
      <motion.div key={framework.name} {...fadeIn} className="flex flex-col gap-7 pl-12">
        <div className="relative border-l border-[#eeeef0] p-8 pt-[24px]">
          <InstallationStepsList framework={framework} showStepNumbers={true} renderTooltip={renderTooltip} />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export function FrameworkCliInstructions({ framework }: { framework: Framework }) {
  const [packageManager, setPackageManager] = useState<PackageManager>('npm');
  const track = useTelemetry();
  const navigate = useNavigate();
  const { environmentSlug } = useParams();

  const renderTooltip = () => (
    <SetupTooltip
      onInviteTeam={() => {
        track(TelemetryEvent.INVITE_TEAM_CLICKED, { origin: 'cli' });
        navigate(buildRoute(ROUTES.SETTINGS_TEAM, { environmentSlug: environmentSlug || '' }));
      }}
      onSkip={() => {
        track(TelemetryEvent.SKIP_ONBOARDING_CLICKED, {
          skippedFrom: 'framework-guides-cli',
        });
        navigate(buildRoute(ROUTES.HOME, { environmentSlug: environmentSlug || '' }));
      }}
    />
  );

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={framework.name} {...fadeIn} className="flex flex-col gap-7 pl-12">
        <div className="relative border-l border-[#eeeef0] p-8 pt-[24px]">
          <InstallationStepsList
            framework={framework}
            showStepNumbers={false}
            packageManager={packageManager}
            onPackageManagerChange={setPackageManager}
            renderTooltip={renderTooltip}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
