import React, { PropsWithChildren } from 'react';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '../primitives/tooltip';
import { validateEnhancedDigestFilters } from './utils';

type Props = PropsWithChildren<{
  issues?: ReturnType<typeof validateEnhancedDigestFilters>;
  isNotInSchema?: boolean;
}>;

export function VariableTooltip({ issues, isNotInSchema, children }: Props) {
  const [isHovered, setIsHovered] = React.useState(false);
  const hasTooltip = !!issues || isNotInSchema;

  return (
    <Tooltip open={isHovered && hasTooltip}>
      <TooltipTrigger asChild>
        <div onMouseLeave={() => setIsHovered(false)} onMouseEnter={() => setIsHovered(true)}>
          {children}
        </div>
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent side="top" className="border-bg-soft bg-bg-weak border p-0.5 shadow-sm">
          <div className="border-stroke-soft/70 text-label-2xs text-text-soft rounded-sm border bg-white p-1">
            {issues && (
              <span className="text-error-base">
                {issues.name}: {issues.message}
              </span>
            )}
            {!issues && isNotInSchema && <span className="text-error-base">Error: Variable missing from schema</span>}
          </div>
        </TooltipContent>
      </TooltipPortal>
    </Tooltip>
  );
}
