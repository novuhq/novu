import { motion } from 'motion/react';
import { ReactNode } from 'react';

type OnboardingShellProps = {
  left: ReactNode;
  right: ReactNode;
  maxLeftWidth?: string;
  alignLeft?: 'center' | 'top';
};

export function OnboardingShell({ left, right, maxLeftWidth = '480px', alignLeft = 'center' }: OnboardingShellProps) {
  return (
    <div className="flex h-screen w-full">
      {/* Left — content (~60%) */}
      <div
        className={`flex w-full flex-col items-center overflow-y-auto bg-white md:w-[60%] ${
          alignLeft === 'top' ? 'pt-16' : 'justify-center'
        }`}
      >
        <motion.div
          key="left"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="w-full px-8"
          style={{ maxWidth: maxLeftWidth }}
        >
          {left}
        </motion.div>
      </div>

      {/* Right — preview panel (~40%) */}
      <div className="relative hidden overflow-hidden bg-white md:flex md:w-[40%]">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 100% 0%, rgba(255,180,210,0.3) 0%, rgba(255,200,220,0.12) 40%, transparent 70%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              'repeating-linear-gradient(135deg, rgba(0,0,0,0.02) 0px, rgba(0,0,0,0.02) 7px, transparent 7px, transparent 14px)',
          }}
        />
        <div className="relative flex flex-1 flex-col items-center justify-center p-8">
          <motion.div
            key="right"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
          >
            {right}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
