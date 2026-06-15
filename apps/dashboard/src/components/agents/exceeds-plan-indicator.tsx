import { RiErrorWarningFill } from 'react-icons/ri';
import { StatusBadge, StatusBadgeIcon } from '@/components/primitives/status-badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { cn } from '@/utils/ui';

type ExceedsPlanResource = 'agent' | 'channel';

const EXCEEDS_PLAN_TOOLTIP_COPY: Record<ExceedsPlanResource, string> = {
  agent:
    "This agent is over the number of active agents included in your plan and won't respond to messages. " +
    'Upgrade your plan or deactivate older agents to activate it.',
  channel:
    "This channel exceeds your plan's active channel limit. The agent won't respond on it until you upgrade " +
    'your plan or disconnect other channels.',
};

/** Canonical over-limit copy, for surfaces that render their own tooltip. */
export function getExceedsPlanTooltipCopy(resource: ExceedsPlanResource): string {
  return EXCEEDS_PLAN_TOOLTIP_COPY[resource];
}

type ExceedsPlanIndicatorProps = {
  resource: ExceedsPlanResource;
  /** `badge` renders the "Exceeds plan" status badge; `icon` a compact warning icon. */
  variant?: 'badge' | 'icon';
  className?: string;
};

/**
 * Single rendering of the "Exceeds plan" over-limit indicator so the copy and
 * visuals never drift between the agents table, details header, and channel
 * surfaces.
 */
export function ExceedsPlanIndicator({ resource, variant = 'badge', className }: ExceedsPlanIndicatorProps) {
  if (variant === 'icon') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            role="img"
            aria-label="Exceeds plan limit"
            // biome-ignore lint/a11y/noNoninteractiveTabindex: tooltip trigger must be focusable so keyboard users can open it; a button is invalid when nested inside a Link
            tabIndex={0}
            className={cn(
              'flex shrink-0 items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              className
            )}
          >
            <RiErrorWarningFill className="text-warning-base size-3.5" />
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-[260px]">{EXCEEDS_PLAN_TOOLTIP_COPY[resource]}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn('inline-flex cursor-default', className)}>
          <StatusBadge variant="light" status="pending">
            <StatusBadgeIcon as={RiErrorWarningFill} />
            Exceeds plan
          </StatusBadge>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-64">
        {EXCEEDS_PLAN_TOOLTIP_COPY[resource]}
      </TooltipContent>
    </Tooltip>
  );
}
