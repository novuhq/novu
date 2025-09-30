import { ReactNode } from 'react';
import { cn } from '@/utils/ui';
import { OptimisticStep } from './use-optimistic-workflow';

interface OptimisticStepWrapperProps {
  children: ReactNode;
  step?: OptimisticStep;
  className?: string;
}

export function OptimisticStepWrapper({ children, step, className }: OptimisticStepWrapperProps) {
  const isOptimistic = step?._optimistic?.isPending;
  const operation = step?._optimistic?.operation;

  return (
    <div
      className={cn(
        'transition-all duration-1000 ease-in-out',
        {
          'opacity-70 animate-[pulse_5s_ease-in-out_infinite]': isOptimistic && operation === 'add',
          'opacity-40 scale-95': isOptimistic && operation === 'remove',
        },
        className
      )}
    >
      {children}
    </div>
  );
}
