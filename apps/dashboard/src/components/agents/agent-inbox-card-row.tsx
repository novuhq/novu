import type { ReactNode } from 'react';
import { RiInformation2Line } from 'react-icons/ri';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { cn } from '@/utils/ui';

type AgentInboxCardRowProps = {
  title: ReactNode;
  description: ReactNode;
  children?: ReactNode;
  divider?: boolean;
  disabled?: boolean;
  footer?: ReactNode;
};

type AgentInboxCardRowInfoTitleProps = {
  label: string;
  infoTooltip: string;
};

export function AgentInboxCardRowInfoTitle({ label, infoTooltip }: AgentInboxCardRowInfoTitleProps) {
  return (
    <span className="flex items-center gap-1">
      {label}
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" aria-label="More info">
            <RiInformation2Line className="text-text-soft size-5" aria-hidden />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">{infoTooltip}</TooltipContent>
      </Tooltip>
    </span>
  );
}

export function AgentInboxCardRow({ title, description, children, divider, disabled, footer }: AgentInboxCardRowProps) {
  return (
    <div className={cn('flex flex-col p-3', divider && 'border-stroke-weak border-b', disabled && 'opacity-60')}>
      <div className="flex items-start justify-between gap-6">
        <div className="flex min-w-0 max-w-[350px] flex-1 flex-col gap-1">
          <div className="text-text-sub text-label-sm font-medium leading-5">{title}</div>
          <p className="text-text-soft text-paragraph-xs leading-4">{description}</p>
        </div>
        {children != null ? <div className="flex w-[360px] shrink-0 flex-col gap-1.5">{children}</div> : null}
      </div>
      {footer ? <div className="pt-3">{footer}</div> : null}
    </div>
  );
}
