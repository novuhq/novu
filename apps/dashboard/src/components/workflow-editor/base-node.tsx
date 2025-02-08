import { ReactNode, useState } from 'react';
import { RiErrorWarningFill } from 'react-icons/ri';
import { cva, VariantProps } from 'class-variance-authority';
import { FeatureFlagsKeysEnum } from '@novu/shared';

import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { STEP_TYPE_TO_COLOR } from '@/utils/color';
import { StepTypeEnum } from '@/utils/enums';
import { cn } from '@/utils/ui';
import { HoverCard, HoverCardContent, HoverCardPortal, HoverCardTrigger } from '../primitives/hover-card';
import { Popover, PopoverArrow, PopoverContent, PopoverPortal, PopoverTrigger } from '../primitives/popover';
import { StepPreview } from '../step-preview-hover-card';

const nodeBadgeVariants = cva(
  'min-w-5 text-xs h-5 border rounded-full opacity-40 flex items-center justify-center p-1',
  {
    variants: {
      variant: {
        neutral: 'border-neutral-500 text-neutral-500',
        feature: 'border-feature text-feature',
        information: 'border-information text-information',
        highlighted: 'border-highlighted text-highlighted',
        stable: 'border-stable text-stable',
        verified: 'border-verified text-verified',
        destructive: 'border-destructive text-destructive',
        success: 'border-success text-success',
        warning: 'border-warning text-warning',
        alert: 'border-alert text-alert',
        soft: 'border-neutral-alpha-200 text-neutral-alpha-200',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  }
);

export interface NodeIconProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof nodeBadgeVariants> {}

export const NodeIcon = ({ children, variant }: NodeIconProps) => {
  return <span className={nodeBadgeVariants({ variant })}>{children}</span>;
};

export const NodeName = ({ children }: { children: ReactNode }) => {
  return (
    <span className="text-foreground-950 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium">
      {children}
    </span>
  );
};

export const NodeHeader = ({ children, type }: { children: ReactNode; type: StepTypeEnum }) => {
  return (
    <div className="flex w-full items-center gap-1.5 px-1 py-2">
      {children}
      <div
        className={cn(
          nodeBadgeVariants({ variant: STEP_TYPE_TO_COLOR[type] as any }),
          'ml-auto min-w-max px-2 uppercase opacity-40'
        )}
      >
        {type.replace('_', '-')}
      </div>
    </div>
  );
};

export const NodeBody = ({
  children,
  type,
  controlValues,
  showPreview,
}: {
  children: ReactNode;
  type: StepTypeEnum;
  controlValues: Record<string, any>;
  showPreview?: boolean;
}) => {
  const isPreviewEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_WORKFLOW_NODE_PREVIEW_ENABLED);

  return (
    <HoverCard openDelay={300}>
      <HoverCardTrigger>
        <div className="bg-neutral-alpha-50 hover-trigger pointer-events-auto relative flex items-center rounded-lg px-1 py-2">
          <span className="text-foreground-400 overflow-hidden text-ellipsis text-nowrap text-sm font-medium">
            {children}
          </span>
          <span className="to-background/90 absolute left-0 top-0 h-full w-full rounded-b-[calc(var(--radius)-1px)] bg-gradient-to-r from-[rgba(255,255,255,0.00)] from-70% to-95%" />
        </div>
      </HoverCardTrigger>
      {(isPreviewEnabled || showPreview) && (
        <HoverCardPortal container={document.getElementById('workflow-canvas-container')}>
          {type !== StepTypeEnum.TRIGGER && (
            <HoverCardContent side="left" className="border-stroke-soft bg-bg-weak w-[450px] p-1" sideOffset={15}>
              <div className="bg-bg-white flex w-full items-center justify-center rounded-lg border border-[#F2F5F8] p-1">
                <StepPreview type={type} controlValues={controlValues} />
              </div>
            </HoverCardContent>
          )}
        </HoverCardPortal>
      )}
    </HoverCard>
  );
};

export const NodeError = ({ children }: { children: ReactNode }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  return (
    <Popover open={isPopoverOpen}>
      <PopoverTrigger asChild>
        <span
          className="error-trigger pointer-events-auto absolute right-0 top-0 size-4 -translate-y-[5px] translate-x-[5px]"
          onMouseEnter={() => setIsPopoverOpen(true)}
          onMouseLeave={() => setIsPopoverOpen(false)}
        >
          <RiErrorWarningFill className="border-destructive fill-destructive bg-foreground-0 rounded-full border p-[1px]" />
        </span>
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContent className="flex min-w-min max-w-[200px] rounded-xl p-2" side="right">
          <PopoverArrow />
          <span className="text-destructive text-xs font-normal">{children}</span>
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
};

export const NODE_WIDTH = 300;
export const NODE_HEIGHT = 86;

const nodeVariants = cva(
  `relative bg-neutral-alpha-200 transition-colors aria-selected:bg-gradient-to-bl aria-selected:from-[#FFB84D] aria-selected:to-[#E300BD] [&>span]:bg-foreground-0 flex w-[300px] flex-col p-px shadow-xs flex [&>span]:flex-1 [&>span]:rounded-[calc(var(--radius)-1px)] [&>span]:p-1 [&>span]:flex [&>span]:flex-col [&>span]:gap-1`,
  {
    variants: {
      variant: {
        default: 'rounded-lg pointer-events-auto [&_span:not(.hover-trigger,.error-trigger)]:pointer-events-none',
        sm: 'text-neutral-400 w-min rounded-lg pointer-events-auto [&_span:not(.hover-trigger,.error-trigger)]:pointer-events-none',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BaseNodeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof nodeVariants> {
  pill?: ReactNode;
  onPillClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export const Node = (props: BaseNodeProps) => {
  const { children, variant, className, pill, onPillClick, ...rest } = props;
  return (
    <div className={nodeVariants({ variant, className })} {...rest}>
      {pill && (
        <div
          className="border-neutral-alpha-200 text-foreground-600 absolute left-0 top-0 flex -translate-y-full items-center gap-1 rounded-t-lg border border-b-0 bg-neutral-50 px-1.5 py-0.5 text-xs font-medium"
          onClick={onPillClick}
        >
          {pill}
        </div>
      )}
      <span>{children}</span>
    </div>
  );
};
