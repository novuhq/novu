import { ReactNode } from 'react';
import { cva, VariantProps } from 'class-variance-authority';
import { StepTypeEnum } from '@novu/shared';
import { Badge, BadgeContent, BadgeContentProps, BadgeProps } from '../primitives/badge';
import { STEP_TYPE_TO_COLOR } from '@/utils/color';

const nodeIconVariants = cva('w-5 h-5 border rounded-full opacity-40 flex items-center justify-center p-1', {
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
});

export interface NodeIconProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof nodeIconVariants> {}

export const NodeIcon = ({ children, variant }: NodeIconProps) => {
  return <span className={nodeIconVariants({ variant })}>{children}</span>;
};

export const NodeName = ({ children }: { children: ReactNode }) => {
  return <span className="text-foreground-950 text-sm font-medium">{children}</span>;
};

export const NodeHeader = ({ children, type }: { children: ReactNode; type: StepTypeEnum }) => {
  return (
    <div className="flex items-center justify-between px-1 py-2">
      <div className="flex items-center gap-1.5">{children}</div>
      <Badge
        variant={STEP_TYPE_TO_COLOR[type] as BadgeProps['variant']}
        kind="pill-stroke"
        className="uppercase opacity-40"
      >
        <BadgeContent variant={STEP_TYPE_TO_COLOR[type] as BadgeContentProps['variant']}>
          {type.replace('_', '-')}
        </BadgeContent>
      </Badge>
    </div>
  );
};

export const NodeBody = ({ children }: { children: ReactNode }) => {
  return (
    <div className="bg-neutral-alpha-50 relative flex items-center rounded-lg px-1 py-2">
      <span className="text-foreground-400 overflow-hidden text-ellipsis text-nowrap text-sm font-medium">
        {children}
      </span>
      <span className="to-background/90 absolute left-0 top-0 h-full w-full bg-gradient-to-r from-[rgba(255,255,255,0.00)] from-70% to-95%" />
    </div>
  );
};

export const NODE_WIDTH = 300;
export const NODE_HEIGHT = 86;

export const nodeVariants = cva(
  `border-neutral-alpha-200 bg-foreground-0 flex w-[300px] flex-col gap-1 border p-1 shadow-xs`,
  {
    variants: {
      variant: {
        default: 'rounded-xl',
        sm: 'text-neutral-400 w-min rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BaseNodeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof nodeVariants> {}

export const Node = ({ children, variant, className }: BaseNodeProps) => {
  return <div className={nodeVariants({ variant, className })}>{children}</div>;
};
