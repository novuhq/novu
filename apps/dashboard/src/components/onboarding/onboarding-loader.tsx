import { ConnectLogo } from '@/components/icons/connect-logo';
import { LogoCircle } from '@/components/icons/logo-circle';
import { motion } from 'motion/react';
import { ComponentType, useEffect, useState } from 'react';
import { RiCheckboxCircleFill, RiLoader3Line, RiLoader4Fill } from 'react-icons/ri';

type LoaderLogoComponent = ComponentType<{ className?: string }>;

export type OnboardingLoaderVariant = 'platform' | 'connect';

type LoaderStep = { id: string; text: string };

const PLATFORM_STEPS: LoaderStep[] = [
  { id: 'org', text: 'Preparing your organization' },
  { id: 'env', text: 'Setting up your environment' },
  { id: 'channels', text: 'Configuring notification channels' },
  { id: 'inbox', text: 'Getting your inbox ready' },
  { id: 'final', text: 'Almost there...' },
];

const CONNECT_STEPS: LoaderStep[] = [
  { id: 'workspace', text: 'Preparing your workspace' },
  { id: 'build', text: 'Setting up where you build agents' },
  { id: 'distribute', text: 'Connecting how you distribute them' },
  { id: 'final', text: 'Almost there...' },
];

const VARIANT_CONFIG: Record<
  OnboardingLoaderVariant,
  { steps: LoaderStep[]; title: string; Logo: LoaderLogoComponent }
> = {
  platform: {
    steps: PLATFORM_STEPS,
    title: 'Setting up your workspace',
    Logo: LogoCircle,
  },
  connect: {
    steps: CONNECT_STEPS,
    title: 'Build and distribute agents',
    Logo: ConnectLogo,
  },
};

const ITEM_HEIGHT = 20;
const GAP = 12;
const CONTAINER_HEIGHT = 140;
export const ONBOARDING_STEP_DELAY_MS = 1500;
export const PLATFORM_STEP_COUNT = PLATFORM_STEPS.length;
export const CONNECT_STEP_COUNT = CONNECT_STEPS.length;

const STEP_DELAY_MS = ONBOARDING_STEP_DELAY_MS;

type OnboardingLoaderProps = {
  variant?: OnboardingLoaderVariant;
  /** When set, step progress resumes from elapsed time instead of restarting at step 0. */
  startedAt?: number | null;
};

type StepStatus = 'success' | 'progress' | 'pending';

function getInitialActiveIndex(stepCount: number, startedAt?: number | null): number {
  if (!startedAt) {
    return 0;
  }

  const index = Math.floor((Date.now() - startedAt) / STEP_DELAY_MS);

  return Math.min(Math.max(0, index), stepCount - 1);
}

function getStepStatus(index: number, activeIndex: number): StepStatus {
  if (index < activeIndex) return 'success';
  if (index === activeIndex) return 'progress';

  return 'pending';
}

export function OnboardingLoader({ variant = 'platform', startedAt = null }: OnboardingLoaderProps) {
  const { steps: stepDefs, title, Logo } = VARIANT_CONFIG[variant];
  const [activeIndex, setActiveIndex] = useState(() => getInitialActiveIndex(stepDefs.length, startedAt));
  const isResuming = activeIndex > 0;

  // Keep `activeIndex` in range when the variant (and therefore `stepDefs.length`) changes — a
  // shorter steps list could leave a previously-valid index hanging off the end and the y-offset
  // animation would over-translate the strip.
  useEffect(() => {
    setActiveIndex((prev) => Math.min(prev, Math.max(0, stepDefs.length - 1)));
  }, [stepDefs.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => {
        if (prev >= stepDefs.length - 1) return prev;

        return prev + 1;
      });
    }, STEP_DELAY_MS);

    return () => clearInterval(interval);
  }, [stepDefs.length]);

  const steps = stepDefs.map((step, index) => ({
    ...step,
    status: getStepStatus(index, activeIndex),
  }));

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <motion.div
        initial={isResuming ? false : { opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex flex-col items-center gap-4"
      >
        <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
          <Logo className="size-10" />
        </motion.div>
        <motion.span
          initial={isResuming ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: isResuming ? 0 : 0.2, duration: 0.4 }}
          className="text-label-md text-text-strong font-medium"
        >
          {title}
        </motion.span>
      </motion.div>

      <div className="relative w-full max-w-xs overflow-hidden" style={{ height: CONTAINER_HEIGHT }}>
        <div
          className="absolute inset-0"
          style={{
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 35%, black 65%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 35%, black 65%, transparent 100%)',
          }}
        >
          <motion.div
            className="absolute left-0 right-0 flex flex-col items-center"
            style={{ gap: GAP }}
            initial={false}
            animate={{ y: CONTAINER_HEIGHT / 2 - ITEM_HEIGHT / 2 - activeIndex * (ITEM_HEIGHT + GAP) }}
            transition={{ type: 'tween', ease: 'easeInOut', duration: 0.4 }}
          >
            {steps.map((step, index) => (
              <motion.div
                key={step.id}
                className="flex shrink-0 items-center gap-2"
                style={{ height: ITEM_HEIGHT }}
                animate={{ opacity: index === activeIndex ? 1 : 0.35 }}
                transition={{ duration: 0.3 }}
              >
                {step.status === 'success' && <RiCheckboxCircleFill className="size-4 shrink-0 text-success" />}
                {step.status === 'progress' && <RiLoader4Fill className="size-4 shrink-0 animate-spin text-text-sub" />}
                {step.status === 'pending' && <RiLoader3Line className="size-4 shrink-0 text-text-sub" />}
                <span className="text-label-sm text-text-sub">{step.text}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
