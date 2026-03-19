import { motion } from 'motion/react';

export function TimelineStepNumber({ index }: { index: number }) {
  return (
    <div className="text-label-xs bg-bg-weak text-text-strong flex h-6 w-6 shrink-0 items-center justify-center rounded-full p-0.5 text-xs font-medium shadow-[0px_0px_0px_1px_#FFF,0px_0px_0px_2px_#E1E4EA]">
      {index + 1}
    </div>
  );
}

export function TimelineLine({ variant = 'default' }: { variant?: 'default' | 'continuous' }) {
  if (variant === 'continuous') {
    return (
      <div
        className="absolute bottom-0 left-3 top-0 w-px -translate-x-1/2"
        style={{
          background: 'linear-gradient(to bottom, transparent 0%, #E1E4EA 15%, #E1E4EA 85%, transparent 100%)',
        }}
      />
    );
  }

  return <div className="absolute left-3 top-6 h-[calc(100%+2rem)] w-px -translate-x-1/2 bg-neutral-100" />;
}

const stepAnimation = (index: number) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: index * 0.1 },
});

interface TimelineStepProps {
  index: number;
  title: string;
  description?: string;
  children?: React.ReactNode;
  rightContent?: React.ReactNode;
  leftExtraContent?: React.ReactNode;
  layout?: 'default' | 'grid';
}

export function TimelineStep({
  index,
  title,
  description,
  children,
  rightContent,
  leftExtraContent,
  layout = 'default',
}: TimelineStepProps) {
  if (layout === 'grid') {
    return (
      <motion.div {...stepAnimation(index)} className="grid grid-cols-[400px_320px] gap-6">
        {/* Left side - Step info */}
        <div className="flex gap-3">
          <div className="relative">
            <TimelineStepNumber index={index} />
          </div>
          <div className="flex w-full flex-col items-start gap-2 pr-5">
            <h3 className="text-text-strong text-sm font-medium">{title}</h3>
            {description && <p className="text-text-soft text-xs">{description}</p>}
            {leftExtraContent}
          </div>
        </div>

        {/* Right side - Form controls */}
        <div className="flex flex-col space-y-2">{rightContent}</div>
      </motion.div>
    );
  }

  return (
    <motion.div {...stepAnimation(index)} className="relative flex min-w-0 gap-6">
      <div className="relative shrink-0">
        <TimelineStepNumber index={index} />
        <TimelineLine />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-label-sm text-neutral-950">{title}</div>
        {description && <div className="text-label-xs text-text-soft mt-2">{description}</div>}
        {children}
      </div>
    </motion.div>
  );
}

interface TimelineContainerProps {
  children: React.ReactNode;
  variant?: 'default' | 'centered';
  className?: string;
}

export function TimelineContainer({ children, variant = 'default', className = '' }: TimelineContainerProps) {
  if (variant === 'centered') {
    return (
      <div className={`flex flex-col items-center ${className}`}>
        <div className="flex items-start self-stretch pl-12">
          <div className="relative flex flex-col items-start gap-10 py-6 pb-3">
            <TimelineLine variant="continuous" />
            {children}
          </div>
        </div>
      </div>
    );
  }

  return <div className={`space-y-8 ${className}`}>{children}</div>;
}
