import { cn } from '@/utils/ui';
import React, { useMemo } from 'react';
import { VariableFrom } from '../workflow-editor/steps/email/variables/variables';
import { VariableIcon } from './components/variable-icon';

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
    <span
      ref={ref}
      onClick={onClick}
      className={cn(
        'bg-bg-white border-stroke-soft font-code relative m-0 box-border inline-flex h-full cursor-pointer items-center gap-[0.25em] rounded-lg border px-1.5 py-0.5 align-middle font-medium leading-[inherit] text-inherit',
        className
      )}
    >
      <VariableIcon variableName={variableName} />
      <span className="leading-[1.2]">{displayVariableName}</span>
      <FiltersSection filters={filters} issues={issues} />
    </span>
  );
});

const FiltersSection = ({
  filters,
}: {
  filters?: string[];
  issues?: { filterName: string; issues: { param: string; issue: string }[] }[];
}) => {
  const parseParams = (input: string) => {
    return input
      .split(',')
      .map((param) => {
        const trimmed = param.trim();

        if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
          return trimmed.slice(1, -1);
        }

        return trimmed;
      })
      .join(', ');
  };

  if (!filters || filters.length === 0) return null;

  const firstFilter = filters[0];
  const firstFilterName = firstFilter.split(':')[0];
  const firstFilterParams = firstFilter.split(':')[1].split(',')[0];
  const parsedFilterParams = parseParams(firstFilterParams);
  const finalParam = parsedFilterParams.length > 0 ? ': ' + parsedFilterParams : null;

  return (
    <div className="flex flex-col gap-2">
      {filters?.length === 1 && (
        <span className="flex items-center whitespace-nowrap">
          <span className="text-text-soft"> | {firstFilterName}</span>
          {filters[0].includes(':') && <span className="text-text-sub">{finalParam}</span>}
        </span>
      )}
      {filters && filters?.length > 1 && (
        <span className="flex items-center whitespace-nowrap">
          <span className="text-text-soft"> | {firstFilterName}</span>
          {filters[0].includes(':') && <span className="text-text-sub">{finalParam}</span>}
          <span className="text-text-soft italic">&nbsp;+{filters.length - 1} more</span>
        </span>
      )}

      {/* {issues.map((issue, index) => (
        <div key={index} className="text-error">
          {issue.filterName}: {issue.issues.map((i) => i.param).join(', ')}
        </div>
      ))} */}
    </div>
  );
};
