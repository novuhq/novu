import { cn } from '@/utils/ui';
import React, { useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '../primitives/tooltip';
import { VariableIcon } from './components/variable-icon';
import { getFirstFilterAndItsArgs, validateEnhancedDigestFilters } from './utils';
import { VariableTooltip } from './variable-tooltip';
import { VariableFrom } from '@/components/maily/types';

export const VariablePill = React.forwardRef<
  HTMLSpanElement,
  {
    variableName: string;
    filters?: string[];
    issues?: ReturnType<typeof validateEnhancedDigestFilters>;
    className?: string;
    onClick?: () => void;
    from?: VariableFrom;
    isNotInSchema?: boolean;
    isPayloadSchemaEnabled?: boolean;
  }
>(({ variableName, filters, issues, className, onClick, isNotInSchema, isPayloadSchemaEnabled }, ref) => {
  const displayVariableName = useMemo(() => {
    if (!variableName) return '';
    const variableParts = variableName.split('.');

    return variableParts.length >= 3 ? '..' + variableParts.slice(-2).join('.') : variableName;
  }, [variableName]);

  return (
    <VariableTooltip issues={issues} isNotInSchema={isPayloadSchemaEnabled ? isNotInSchema : false}>
      <span
        ref={ref}
        onClick={onClick}
        className={cn(
          'bg-bg-white border-stroke-soft font-code relative m-0 box-border inline-flex h-full cursor-pointer items-center gap-[0.25em] rounded-lg border px-1.5 py-px align-middle font-medium leading-[inherit] text-inherit',
          { 'hover:bg-error-base/2.5': !!issues },
          { 'hover:bg-error-base/2.5': isNotInSchema && !issues },
          className
        )}
      >
        <VariableIcon
          variableName={variableName}
          hasError={!!issues}
          isNotInSchema={isPayloadSchemaEnabled ? isNotInSchema : false}
        />
        {/* INFO: Keep the color defined on the span to avoid overriding it in maily components for example button */}
        <span className="leading-1 text-text-sub max-w-[24ch] truncate" title={displayVariableName}>
          {displayVariableName}
        </span>
        <FiltersSection filters={filters} />
      </span>
    </VariableTooltip>
  );
});

const FiltersSection = ({ filters }: { filters?: string[] }) => {
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
