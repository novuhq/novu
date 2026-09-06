import { RiArrowRightSLine, RiInformation2Line } from 'react-icons/ri';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@/components/primitives/tooltip';
import { cn } from '@/utils/ui';

type SetupRowProps = {
  title: string;
  tooltipContent: React.ReactNode;
  description: React.ReactNode;
  className?: string;
};

export function SetupRow({ title, tooltipContent, description, className }: SetupRowProps) {
  const stopRowNavigation = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  return (
    <div className={cn('flex w-full min-w-0 flex-col gap-1.5', className)}>
      <div className="flex w-full min-w-0 items-center gap-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="text-label-xs text-text-strong">{title}</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="inline-flex shrink-0 cursor-help"
                onClick={stopRowNavigation}
                onPointerDown={stopRowNavigation}
                onKeyDown={stopRowNavigation}
              >
                <RiInformation2Line className="size-4 text-text-soft" />
              </span>
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipContent side="left" hideWhenDetached>
                {tooltipContent}
              </TooltipContent>
            </TooltipPortal>
          </Tooltip>
        </div>
        <span className="text-text-sub inline-flex shrink-0 items-center text-xs font-medium transition-colors duration-200 ease-out group-hover:translate-x-0.5 group-hover:text-text-strong">
          Setup
        </span>
        <RiArrowRightSLine
          aria-hidden
          className="size-4 shrink-0 text-text-sub transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:text-text-strong"
        />
      </div>
      <span className="text-text-soft text-xs">{description}</span>
    </div>
  );
}
