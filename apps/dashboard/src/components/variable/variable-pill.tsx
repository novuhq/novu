import { cn } from '@/utils/ui';
import React from 'react';
import { VariableFrom } from '../workflow-editor/steps/email/variables/variables';
import { VariableIcon } from './components/variable-icon';

export const VariablePill = React.forwardRef<
  HTMLSpanElement,
  {
    variableName: string;
    hasFilters: boolean;
    className?: string;
    onClick?: () => void;
    from?: VariableFrom;
  }
>(({ variableName, hasFilters, className, onClick, from = 'content-variable' }, ref) => {
  function getShortVariableName(variableName: string) {
    if (!variableName) return '';
    if (from !== VariableFrom.Bubble) return variableName;

    const parts = variableName.split('.');
    if (parts.length <= 2) return variableName;

    return `..${parts.slice(-2).join('.')}`;
  }

  return (
    <span
      ref={ref}
      onClick={onClick}
      className={cn(
        'bg-bg-white border-stroke-soft font-code relative m-0 box-border inline-flex h-full cursor-pointer items-center gap-[0.25em] rounded-lg border px-1.5 py-0.5 align-middle font-medium leading-[inherit] text-inherit',
        className
      )}
    >
      <VariableIcon variableName={variableName} />
      <span className="leading-[1.2]">{getShortVariableName(variableName)}</span>
      {hasFilters && <span className="bg-feature-base h-[0.275em] w-[0.275em] rounded-full" />}
    </span>
  );
});
