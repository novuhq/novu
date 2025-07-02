import React, { PropsWithChildren } from 'react';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@/components/primitives/tooltip';

type Props = PropsWithChildren<{
  hasError?: boolean;
  errorMessage?: string;
}>;

export function TranslationTooltip({ hasError, errorMessage, children }: Props) {
  const [isHovered, setIsHovered] = React.useState(false);
  const hasTooltip = !!hasError && !!errorMessage;

  return (
    <Tooltip open={isHovered && hasTooltip}>
      <TooltipTrigger asChild>
        <span onMouseLeave={() => setIsHovered(false)} onMouseEnter={() => setIsHovered(true)}>
          {children}
        </span>
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent side="top" className="border-bg-soft bg-bg-weak border p-0.5 shadow-sm">
          <div className="border-stroke-soft/70 text-label-2xs text-text-soft rounded-sm border bg-white p-1">
            {hasError && errorMessage && <span className="text-error-base">{errorMessage}</span>}
          </div>
        </TooltipContent>
      </TooltipPortal>
    </Tooltip>
  );
}
