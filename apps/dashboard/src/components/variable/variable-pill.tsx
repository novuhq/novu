import { cn } from '@/utils/ui';
import React, { useMemo } from 'react';
import { VariableFrom } from '../workflow-editor/steps/email/variables/variables';
import { VariableIcon } from './components/variable-icon';
import { VariableTooltip } from './variable-tooltip';
import { getFirstFilterAndItsArgs } from './utils';

export const VariablePill = React.forwardRef<
  HTMLSpanElement,
  {
    variableName: string;
    filters?: string[];
    issues?: { filterName: string; issues: { param: string; issue: string }[] }[];
    className?: string;
    onClick?: () => void;
    from?: VariableFrom;
  }
>(({ variableName, filters, issues, className, onClick }, ref) => {
  const displayVariableName = useMemo(() => {
    if (!variableName) return '';
    const variableParts = variableName.split('.');

    return variableParts.length >= 3 ? '..' + variableParts.slice(-2).join('.') : variableName;
  }, [variableName]);

  return (
    <VariableTooltip issues={issues} filters={filters}>
      <span
        ref={ref}
        onClick={onClick}
        className={cn(
          'bg-bg-white border-stroke-soft font-code relative m-0 box-border inline-flex h-full cursor-pointer items-center gap-[0.25em] rounded-lg border px-1.5 py-0.5 align-middle font-medium leading-[inherit] text-inherit',
          { 'hover:bg-error-base/2.5': !!issues?.length },
          className
        )}
      >
        <VariableIcon variableName={variableName} hasError={!!issues?.length} />
        <span className="leading-[1.2]">{displayVariableName}</span>
        <FiltersSection filters={filters} issues={issues} />
      </span>
    </VariableTooltip>
  );
});

const FiltersSection = ({
  filters,
}: {
  filters?: string[];
  issues?: { filterName: string; issues: { param: string; issue: string }[] }[];
}) => {
  if (!filters || filters.length === 0) return null;

  const { finalParam, firstFilterName, firstFilter } = getFirstFilterAndItsArgs(filters);

  return (
    <div className="flex flex-col gap-2">
      {filters?.length > 0 && (
        <span className="flex items-center whitespace-nowrap">
          <span className="text-text-soft"> | {firstFilterName}</span>
          {firstFilter.includes(':') && filters.length === 1 && <span className="text-text-sub">{finalParam}</span>}
          {filters && filters?.length > 1 && (
            <span className="text-text-soft italic">, +{filters.length - 1} more</span>
          )}
        </span>
      )}
    </div>
  );
};
