// AlignUI Badge v0.0.0

import { Slot } from '@radix-ui/react-slot';
import * as React from 'react';

import type { PolymorphicComponentProps } from '@/utils/polymorphic';
import { recursiveCloneChildren } from '@/utils/recursive-clone-children';
import { tv, type VariantProps } from '@/utils/tv';

const BADGE_ROOT_NAME = 'BadgeRoot';
const BADGE_ICON_NAME = 'BadgeIcon';
const BADGE_DOT_NAME = 'BadgeDot';

export const badgeVariants = tv({
  slots: {
    root: 'inline-flex items-center justify-center rounded-full leading-none transition duration-200 ease-out',
    icon: 'shrink-0',
    dot: [
      // base
      'dot',
      'flex items-center justify-center',
      // before
      'before:size-1 before:rounded-full before:bg-current',
    ],
  },
  variants: {
    size: {
      sm: {
        root: 'h-4 gap-1.5 px-2 text-subheading-2xs uppercase has-[>.dot]:gap-2',
        icon: '-mx-1 size-3',
        dot: '-mx-2 size-4',
      },
      md: {
        root: 'h-5 gap-1.5 px-2 text-label-xs',
        icon: '-mx-1 size-4',
        dot: '-mx-1.5 size-4',
      },
    },
    variant: {
      filled: {
        root: 'text-static-white',
      },
      light: {},
      lighter: {},
      stroke: {
        root: 'ring-1 ring-inset ring-current',
      },
    },
    color: {
      gray: {},
      blue: {},
      orange: {},
      red: {},
      green: {},
      yellow: {},
      purple: {},
      sky: {},
      pink: {},
      teal: {},
    },
    disabled: {
      true: {
        root: 'pointer-events-none',
      },
    },
    square: {
      true: {},
    },
  },
  compoundVariants: [
    //#region variant=filled
    {
      variant: 'filled',
      color: 'gray',
      class: {
        root: 'bg-faded-base',
      },
    },
    {
      variant: 'filled',
      color: 'blue',
      class: {
        root: 'bg-information-base',
      },
    },
    {
      variant: 'filled',
      color: 'orange',
      class: {
        root: 'bg-warning-base',
      },
    },
    {
      variant: 'filled',
      color: 'red',
      class: {
        root: 'bg-error-base',
      },
    },
    {
      variant: 'filled',
      color: 'green',
      class: {
        root: 'bg-success-base',
      },
    },
    {
      variant: 'filled',
      color: 'yellow',
      class: {
        root: 'bg-away-base',
      },
    },
    {
      variant: 'filled',
      color: 'purple',
      class: {
        root: 'bg-feature-base',
      },
    },
    {
      variant: 'filled',
      color: 'sky',
      class: {
        root: 'bg-verified-base',
      },
    },
    {
      variant: 'filled',
      color: 'pink',
      class: {
        root: 'bg-highlighted-base',
      },
    },
    {
      variant: 'filled',
      color: 'teal',
      class: {
        root: 'bg-stable-base',
      },
    },
    // #endregion

    //#region variant=light
    {
      variant: 'light',
      color: 'gray',
      class: {
        root: 'bg-faded-light text-faded-dark',
      },
    },
    {
      variant: 'light',
      color: 'blue',
      class: {
        root: 'bg-information-light text-information-dark',
      },
    },
    {
      variant: 'light',
      color: 'orange',
      class: {
        root: 'bg-warning-light text-warning-dark',
      },
    },
    {
      variant: 'light',
      color: 'red',
      class: {
        root: 'bg-error-light text-error-dark',
      },
    },
    {
      variant: 'light',
      color: 'green',
      class: {
        root: 'bg-success-light text-success-dark',
      },
    },
    {
      variant: 'light',
      color: 'yellow',
      class: {
        root: 'bg-away-light text-away-dark',
      },
    },
    {
      variant: 'light',
      color: 'purple',
      class: {
        root: 'bg-feature-light text-feature-dark',
      },
    },
    {
      variant: 'light',
      color: 'sky',
      class: {
        root: 'bg-verified-light text-verified-dark',
      },
    },
    {
      variant: 'light',
      color: 'pink',
      class: {
        root: 'bg-highlighted-light text-highlighted-dark',
      },
    },
    {
      variant: 'light',
      color: 'teal',
      class: {
        root: 'bg-stable-light text-stable-dark',
      },
    },
    //#endregion

    //#region variant=lighter
    {
      variant: 'lighter',
      color: 'gray',
      class: {
        root: 'bg-faded-lighter text-faded-base',
      },
    },
    {
      variant: 'lighter',
      color: 'blue',
      class: {
        root: 'bg-information-lighter text-information-base',
      },
    },
    {
      variant: 'lighter',
      color: 'orange',
      class: {
        root: 'bg-warning-lighter text-warning-base',
      },
    },
    {
      variant: 'lighter',
      color: 'red',
      class: {
        root: 'bg-error-lighter text-error-base',
      },
    },
    {
      variant: 'lighter',
      color: 'green',
      class: {
        root: 'bg-success-lighter text-success-base',
      },
    },
    {
      variant: 'lighter',
      color: 'yellow',
      class: {
        root: 'bg-away-lighter text-away-base',
      },
    },
    {
      variant: 'lighter',
      color: 'purple',
      class: {
        root: 'bg-feature-lighter text-feature-base',
      },
    },
    {
      variant: 'lighter',
      color: 'sky',
      class: {
        root: 'bg-verified-lighter text-verified-base',
      },
    },
    {
      variant: 'lighter',
      color: 'pink',
      class: {
        root: 'bg-highlighted-lighter text-highlighted-base',
      },
    },
    {
      variant: 'lighter',
      color: 'teal',
      class: {
        root: 'bg-stable-lighter text-stable-base',
      },
    },
    //#endregion

    //#region variant=stroke
    {
      variant: 'stroke',
      color: 'gray',
      class: {
        root: 'text-faded-base',
      },
    },
    {
      variant: 'stroke',
      color: 'blue',
      class: {
        root: 'text-information-base',
      },
    },
    {
      variant: 'stroke',
      color: 'orange',
      class: {
        root: 'text-warning-base',
      },
    },
    {
      variant: 'stroke',
      color: 'red',
      class: {
        root: 'text-error-base',
      },
    },
    {
      variant: 'stroke',
      color: 'green',
      class: {
        root: 'text-success-base',
      },
    },
    {
      variant: 'stroke',
      color: 'yellow',
      class: {
        root: 'text-away-base',
      },
    },
    {
      variant: 'stroke',
      color: 'purple',
      class: {
        root: 'text-feature-base',
      },
    },
    {
      variant: 'stroke',
      color: 'sky',
      class: {
        root: 'text-verified-base',
      },
    },
    {
      variant: 'stroke',
      color: 'pink',
      class: {
        root: 'text-highlighted-base',
      },
    },
    {
      variant: 'stroke',
      color: 'teal',
      class: {
        root: 'text-stable-base',
      },
    },
    //#endregion

    //#region square
    {
      size: 'sm',
      square: true,
      class: {
        root: 'min-w-4 px-1',
      },
    },
    {
      size: 'md',
      square: true,
      class: {
        root: 'min-w-5 px-1',
      },
    },
    //#endregion

    //#region disabled
    {
      disabled: true,
      variant: ['stroke', 'filled', 'light', 'lighter'],
      color: ['red', 'gray', 'blue', 'orange', 'green', 'yellow', 'purple', 'sky', 'pink', 'teal'],
      class: {
        root: ['ring-1 ring-inset ring-stroke-soft', 'bg-transparent text-text-disabled'],
      },
    },
    //#endregion
  ],
  defaultVariants: {
    variant: 'filled',
    size: 'sm',
    color: 'gray',
  },
});

type BadgeSharedProps = VariantProps<typeof badgeVariants>;

type BadgeRootProps = VariantProps<typeof badgeVariants> &
  React.HTMLAttributes<HTMLDivElement> & {
    asChild?: boolean;
  };

const BadgeRoot = React.forwardRef<HTMLDivElement, BadgeRootProps>(
  ({ asChild, size, variant, color, disabled, square, children, className, ...rest }, forwardedRef) => {
    const uniqueId = React.useId();
    const Component = asChild ? Slot : 'div';
    const { root } = badgeVariants({ size, variant, color, disabled, square });

    const sharedProps: BadgeSharedProps = {
      size,
      variant,
      color,
    };

    const extendedChildren = recursiveCloneChildren(
      children as React.ReactElement[],
      sharedProps,
      [BADGE_ICON_NAME, BADGE_DOT_NAME],
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
BadgeRoot.displayName = BADGE_ROOT_NAME;

function BadgeIcon<T extends React.ElementType>({
  className,
  size,
  variant,
  color,
  as,
  ...rest
}: PolymorphicComponentProps<T, BadgeSharedProps>) {
  const Component = as || 'div';
  const { icon } = badgeVariants({ size, variant, color });

  return <Component className={icon({ class: className })} {...rest} />;
}
BadgeIcon.displayName = BADGE_ICON_NAME;

type BadgeDotProps = BadgeSharedProps & Omit<React.HTMLAttributes<HTMLDivElement>, 'color'>;

function BadgeDot({ size, variant, color, className, ...rest }: BadgeDotProps) {
  const { dot } = badgeVariants({ size, variant, color });

  return <div className={dot({ class: className })} {...rest} />;
}
BadgeDot.displayName = BADGE_DOT_NAME;

export { BadgeRoot as Badge, BadgeIcon, BadgeDot as Dot, BadgeRoot as Root };
