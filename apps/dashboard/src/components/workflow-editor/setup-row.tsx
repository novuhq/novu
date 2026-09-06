import { RiArrowRightSLine, RiInformation2Line } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@/components/primitives/tooltip';
import { cn } from '@/utils/ui';

type SetupRowProps = {
  title: string;
  tooltipContent: React.ReactNode;
  description: React.ReactNode;
  className?: string;
  to?: string;
  showSetupLabel?: boolean;
};

type SetupRowInfoTooltipProps = {
  title: string;
  tooltipContent: React.ReactNode;
};

function SetupRowInfoTooltip({ title, tooltipContent }: SetupRowInfoTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="text-text-soft inline-flex size-4 shrink-0 items-center justify-center">
          <RiInformation2Line className="size-4 text-text-soft" />
          <span className="sr-only">About {title}</span>
        </button>
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent side="left" hideWhenDetached>
          {tooltipContent}
        </TooltipContent>
      </TooltipPortal>
    </Tooltip>
  );
}

export function SetupRow({
  title,
  tooltipContent,
  description,
  className,
  to,
  showSetupLabel = true,
}: SetupRowProps) {
  const linkAriaLabel = typeof description === 'string' ? `${title}. ${description}` : title;

  return (
    <div className={cn('group relative flex w-full min-w-0 flex-col gap-1.5', to && 'cursor-pointer', className)}>
      {to ? <Link to={to} className="absolute inset-0 z-0" aria-label={linkAriaLabel} /> : null}
      <div className="relative z-10 flex w-full min-w-0 flex-col gap-1.5 pointer-events-none">
        <div className="flex w-full min-w-0 items-center gap-1.5">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="text-label-xs text-text-strong">{title}</span>
          </div>
          <div className="pointer-events-auto">
            <SetupRowInfoTooltip title={title} tooltipContent={tooltipContent} />
          </div>
          <div className="inline-flex shrink-0 items-center">
            {showSetupLabel ? (
              <span className="text-text-sub inline-flex shrink-0 items-center text-xs font-medium transition-colors duration-200 ease-out group-hover:translate-x-0.5 group-hover:text-text-strong">
                Setup
              </span>
            ) : null}
            <RiArrowRightSLine
              aria-hidden
              className="size-4 shrink-0 text-text-sub transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:text-text-strong"
            />
          </div>
        </div>
        {typeof description === 'string' ? (
          <span className="text-text-soft text-xs">{description}</span>
        ) : (
          description
        )}
      </div>
    </div>
  );
}
