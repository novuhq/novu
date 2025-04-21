import { cn } from '@/utils/ui';
import React, { useMemo } from 'react';
import { VariableFrom } from '../workflow-editor/steps/email/variables/variables';
import { VariableIcon } from './components/variable-icon';
import { VariableTooltip } from './variable-tooltip';
import { getFirstFilterAndItsArgs } from './utils';
import { TooltipContent, TooltipPortal } from '../primitives/tooltip';
import { TooltipTrigger } from '../primitives/tooltip';
import { Tooltip } from '../primitives/tooltip';

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
    <VariableTooltip issues={issues}>
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
        <span className="max-w-[24ch] truncate leading-[1.2]" title={displayVariableName}>
          {displayVariableName}
        </span>
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
  const getFilterNames = useMemo(() => {
    return filters
      ?.slice(1)
      .map((f) => f.split(':')[0].trim())
      .join(', ');
  }, [filters]);

  if (!filters || filters.length === 0) return null;

  const { finalParam, firstFilterName } = getFirstFilterAndItsArgs(filters);
  const hasArgs = filters.length === 1 && finalParam;

  return (
    <div className="flex flex-col gap-2">
      {filters?.length > 0 && (
        <span className="flex items-center whitespace-nowrap">
          <span className="text-text-soft">{hasArgs ? `| ${firstFilterName}:\u00A0` : `| ${firstFilterName}`}</span>
          {hasArgs && (
            <span className="text-text-sub max-w-[24ch] truncate" title={finalParam}>
              {finalParam}
            </span>
          )}
          {filters && filters?.length > 1 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-text-soft italic">, +{filters.length - 1} more</span>
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipContent side="top" className="border-bg-soft bg-bg-weak border p-0.5 shadow-sm">
                  <div className="border-stroke-soft/70 text-label-2xs text-text-soft rounded-sm border bg-white p-1">
                    <span>
                      Other filters: <span className="text-feature">{getFilterNames}</span>
                    </span>
                  </div>
                </TooltipContent>
              </TooltipPortal>
            </Tooltip>
          )}
        </span>
      )}
    </div>
  );
};
