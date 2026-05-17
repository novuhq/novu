import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { RiCheckboxCircleFill, RiLoader3Line, RiLoader4Fill } from 'react-icons/ri';
import { LogoCircle } from '@/components/icons/logo-circle';

const ONBOARDING_STEPS = [
  { id: 'org', text: 'Preparing your organization' },
  { id: 'env', text: 'Setting up your environment' },
  { id: 'channels', text: 'Configuring notification channels' },
  { id: 'inbox', text: 'Getting your inbox ready' },
  { id: 'final', text: 'Almost there...' },
] as const;

const ITEM_HEIGHT = 20;
const GAP = 12;
const CONTAINER_HEIGHT = 140;
const STEP_DELAY_MS = 1500;

export function OnboardingLoader() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => {
        if (prev >= ONBOARDING_STEPS.length - 1) return prev;

        return prev + 1;
      });
    }, STEP_DELAY_MS);

    return () => clearInterval(interval);
  }, []);

  const steps = ONBOARDING_STEPS.map((step, index) => {
    const status = index < activeIndex ? 'success' : index === activeIndex ? 'progress' : 'pending';

    return { ...step, status };
  });

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex flex-col items-center gap-4"
      >
        <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
          <LogoCircle className="size-10" />
        </motion.div>
        <motion.span
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-label-md text-text-strong font-medium"
        >
          Setting up your workspace
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
