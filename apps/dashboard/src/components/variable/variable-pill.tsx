import { cn } from '@/utils/ui';
import React from 'react';

export const VariablePill = React.forwardRef<
  HTMLSpanElement,
  {
    variable: string;
    hasFilters: boolean;
    className?: string;
    onClick?: () => void;
  }
>(({ variable, hasFilters, className, onClick }, ref) => {
  return (
    <span
      ref={ref}
      onClick={onClick}
      className={cn(
        'bg-bg-weak text-text-sub border-stroke-soft relative m-0 box-border inline-flex h-full cursor-pointer items-center gap-[0.25em] rounded-lg border px-1.5 py-0.5 align-middle font-[inherit] font-medium leading-[inherit] text-inherit',
        className
      )}
    >
      <span
        className={`bg-url-code bg-repeat-no-repeat h-[calc(1em-2px)] w-[calc(1em-2px)] min-w-[calc(1em-2px)] bg-[url("/images/code.svg")] bg-contain bg-center`}
      ></span>
      <span className="leading-[1.2]">{variable}</span>
      {hasFilters && <span className="bg-feature-base h-[0.275em] w-[0.275em] rounded-full" />}
    </span>
  );
});
