import React, { PropsWithChildren, useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '../primitives/tooltip';

type Props = PropsWithChildren<{
  issues?:
    | {
        filterName: string;
        issues: {
          param: string;
          issue: string;
        }[];
      }[]
    | undefined;
  filters?: string[];
}>;

export function VariableTooltip({ issues, filters, children }: Props) {
  const [isHovered, setIsHovered] = React.useState(false);

  const getFilterNames = useMemo(() => {
    return filters
      ?.slice(1)
      .map((f) => f.split(':')[0].trim())
      .join(', ');
  }, [filters]);

  return (
    <Tooltip open={isHovered && (!!issues?.length || (filters && filters?.length > 1))}>
      <TooltipTrigger asChild>
        <div onMouseLeave={() => setIsHovered(false)} onMouseEnter={() => setIsHovered(true)}>
          {children}
        </div>
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent side="top" className="border-bg-soft bg-bg-weak border p-0.5 shadow-sm">
          <div className="border-stroke-soft/70 text-label-2xs text-text-soft rounded-sm border bg-white p-1">
            {issues && issues.length > 0 ? (
              <span className="text-error-base">{issues?.[0].filterName} is missing a value.</span>
            ) : (
              <span>
                Other filters: <span className="text-feature">{getFilterNames}</span>
              </span>
            )}
          </div>
        </TooltipContent>
      </TooltipPortal>
    </Tooltip>
  );
}
