import React from 'react';
import { cn } from '@/utils/ui';

const Panel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, className, ...restDivProps }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-neutral-alpha-50 flex flex-col gap-2 overflow-auto rounded-lg border border-neutral-200 p-2',
          className
        )}
        {...restDivProps}
      >
        {children}
      </div>
    );
  }
);

const PanelHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, ...restDivProps }, ref) => {
    return (
      <div ref={ref} className="flex items-center gap-1 text-sm font-medium" {...restDivProps}>
        {children}
      </div>
    );
  }
);

const PanelContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, className, ...restDivProps }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('bg-background border-neutral-alpha-200 h-full rounded-lg border border-dashed p-3', className)}
        {...restDivProps}
      >
        {children}
      </div>
    );
  }
);

export { Panel, PanelHeader, PanelContent };
