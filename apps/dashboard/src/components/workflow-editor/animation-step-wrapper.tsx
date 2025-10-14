import { ReactNode } from 'react';
import { cn } from '@/utils/ui';

interface AnimationStepWrapperProps {
  children: ReactNode;
  isPending?: boolean;
  isRemoving?: boolean;
  className?: string;
}

export function AnimationStepWrapper({ children, isPending, isRemoving, className }: AnimationStepWrapperProps) {
  return (
    <div
      className={cn(
        'transition-all duration-1000 scale-100 ease-in-out',
        {
          'opacity-70 scale-95 animate-[pulse_5s_ease-in-out_infinite]': isPending,
          'opacity-40 scale-95': isRemoving,
        },
        className
      )}
    >
      {children}
    </div>
  );
}
