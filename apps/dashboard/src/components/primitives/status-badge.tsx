// AlignUI StatusBadge v0.0.0

import { Slot } from '@radix-ui/react-slot';
import * as React from 'react';

import type { PolymorphicComponentProps } from '@/utils/polymorphic';
import { recursiveCloneChildren } from '@/utils/recursive-clone-children';
import { tv, type VariantProps } from '@/utils/tv';

const STATUS_BADGE_ROOT_NAME = 'StatusBadgeRoot';
const STATUS_BADGE_ICON_NAME = 'StatusBadgeIcon';
const STATUS_BADGE_DOT_NAME = 'StatusBadgeDot';

export const statusBadgeVariants = tv({
  slots: {
    root: [
      'inline-flex h-6 items-center justify-center gap-2 whitespace-nowrap rounded-md px-2 text-label-xs',
      'has-[>.dot]:gap-1.5',
    ],
    icon: '-mx-1 size-4',
    dot: [
      // base
      'dot -mx-1 flex size-4 items-center justify-center',
      // before
      'before:size-1.5 before:rounded-full before:bg-current',
    ],
  },
  variants: {
    variant: {
      stroke: {
        root: 'bg-bg-white text-text-sub ring-1 ring-inset ring-stroke-soft',
      },
      light: {},
    },
    status: {
      completed: {
        icon: 'text-success-base',
        dot: 'text-success-base',
      },
      pending: {
        icon: 'text-warning-base',
        dot: 'text-warning-base',
      },
      failed: {
        icon: 'text-error-base',
        dot: 'text-error-base',
      },
      disabled: {
        icon: 'text-faded-base',
        dot: 'text-faded-base',
      },
    },
  },
  compoundVariants: [
    {
      variant: 'light',
      status: 'completed',
      class: {
        root: 'bg-success-lighter text-success-base',
      },
    },
    {
      variant: 'light',
      status: 'pending',
      class: {
        root: 'bg-warning-lighter text-warning-base',
      },
    },
    {
      variant: 'light',
      status: 'failed',
      class: {
        root: 'bg-error-lighter text-error-base',
      },
    },
    {
      variant: 'light',
      status: 'disabled',
      class: {
        root: 'bg-faded-lighter text-text-sub',
      },
    },
  ],
  defaultVariants: {
    status: 'disabled',
    variant: 'stroke',
  },
});

type StatusBadgeSharedProps = VariantProps<typeof statusBadgeVariants>;

type StatusBadgeRootProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof statusBadgeVariants> & {
    asChild?: boolean;
  };

const StatusBadgeRoot = React.forwardRef<HTMLDivElement, StatusBadgeRootProps>(
  ({ asChild, children, variant, status, className, ...rest }, forwardedRef) => {
    const uniqueId = React.useId();
    const Component = asChild ? Slot : 'div';
    const { root } = statusBadgeVariants({ variant, status });

    const sharedProps: StatusBadgeSharedProps = {
      variant,
      status,
    };

    const extendedChildren = recursiveCloneChildren(
      children as React.ReactElement[],
      sharedProps,
      [STATUS_BADGE_ICON_NAME, STATUS_BADGE_DOT_NAME],
      uniqueId,
      asChild
    );

    return (
      <Component ref={forwardedRef} className={root({ class: className })} {...rest}>
        {extendedChildren}
      </Component>
    );
  }
);
StatusBadgeRoot.displayName = STATUS_BADGE_ROOT_NAME;

function StatusBadgeIcon<T extends React.ElementType = 'div'>({
  variant,
  status,
  className,
  as,
}: PolymorphicComponentProps<T, StatusBadgeSharedProps>) {
  const Component = as || 'div';
  const { icon } = statusBadgeVariants({ variant, status });

  return <Component className={icon({ class: className })} />;
}
StatusBadgeIcon.displayName = STATUS_BADGE_ICON_NAME;

function StatusBadgeDot({
  variant,
  status,
  className,
  ...rest
}: StatusBadgeSharedProps & React.HTMLAttributes<HTMLDivElement>) {
  const { dot } = statusBadgeVariants({ variant, status });

  return <div className={dot({ class: className })} {...rest} />;
}
StatusBadgeDot.displayName = STATUS_BADGE_DOT_NAME;

export {
  StatusBadgeDot as Dot,
  StatusBadgeRoot as Root,
  StatusBadgeRoot as StatusBadge,
  StatusBadgeIcon,
  type StatusBadgeRootProps as StatusBadgeProps,
};
