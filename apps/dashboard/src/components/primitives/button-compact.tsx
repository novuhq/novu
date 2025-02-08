import { Slot } from '@radix-ui/react-slot';
import * as React from 'react';
import { IconType } from 'react-icons';

import { PolymorphicComponentProps } from '@/utils/polymorphic';
import { recursiveCloneChildren } from '@/utils/recursive-clone-children';
import { tv, type VariantProps } from '@/utils/tv';

const COMPACT_BUTTON_ROOT_NAME = 'CompactButtonRoot';
const COMPACT_BUTTON_ICON_NAME = 'CompactButtonIcon';

export const compactButtonVariants = tv({
  slots: {
    root: [
      // base
      'relative flex shrink-0 items-center justify-center outline-none',
      'transition duration-200 ease-out',
      // disabled
      'disabled:pointer-events-none disabled:border-transparent disabled:bg-transparent disabled:text-text-disabled disabled:shadow-none',
      // focus
      'focus:outline-none',
    ],
    icon: '',
  },
  variants: {
    variant: {
      stroke: {
        root: [
          // base
          'border border-stroke-soft bg-bg-white text-text-sub shadow-xs',
          // hover
          'hover:border-transparent hover:bg-bg-weak hover:text-text-strong hover:shadow-none',
          // focus
          'focus-visible:border-transparent focus-visible:bg-bg-strong focus-visible:text-text-white focus-visible:shadow-none',
        ],
      },
      ghost: {
        root: [
          // base
          'bg-transparent text-text-sub',
          // hover
          'hover:bg-bg-weak hover:text-text-strong',
          // focus
          'focus-visible:bg-bg-strong focus-visible:text-text-white',
        ],
      },
      white: {
        root: [
          // base
          'bg-bg-white text-text-sub shadow-xs',
          // hover
          'hover:bg-bg-weak hover:text-text-strong',
          // focus
          'focus-visible:bg-bg-strong focus-visible:text-text-white',
        ],
      },
      modifiable: {},
    },
    size: {
      lg: {
        root: 'size-6',
        icon: 'size-5',
      },
      md: {
        root: 'size-5',
        icon: 'size-[18px]',
      },
    },
    fullRadius: {
      true: {
        root: 'rounded-full',
      },
      false: {
        root: 'rounded-md',
      },
    },
  },
  defaultVariants: {
    variant: 'stroke',
    size: 'md',
    fullRadius: false,
  },
});

type CompactButtonSharedProps = Omit<VariantProps<typeof compactButtonVariants>, 'fullRadius'>;

type CompactButtonProps = VariantProps<typeof compactButtonVariants> &
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    asChild?: boolean;
  };

const CompactButtonRoot = React.forwardRef<HTMLButtonElement, CompactButtonProps>(
  ({ asChild, variant, size, fullRadius, children, className, ...rest }, forwardedRef) => {
    const uniqueId = React.useId();
    const Component = asChild ? Slot : 'button';
    const { root } = compactButtonVariants({ variant, size, fullRadius });

    const sharedProps: CompactButtonSharedProps = {
      variant,
      size,
    };

    const extendedChildren = recursiveCloneChildren(
      children as React.ReactElement[],
      sharedProps,
      [COMPACT_BUTTON_ICON_NAME],
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
CompactButtonRoot.displayName = COMPACT_BUTTON_ROOT_NAME;

function CompactButtonIcon<T extends React.ElementType>({
  variant,
  size,
  as,
  className,
  ...rest
}: PolymorphicComponentProps<T, CompactButtonSharedProps>) {
  const Component = as || 'div';
  const { icon } = compactButtonVariants({ variant, size });

  return <Component className={icon({ class: className })} {...rest} />;
}
CompactButtonIcon.displayName = COMPACT_BUTTON_ICON_NAME;

const CompactButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof CompactButtonRoot> & {
    icon: IconType;
  }
>(({ children, icon: Icon, ...rest }, forwardedRef) => {
  return (
    <CompactButtonRoot ref={forwardedRef} {...rest}>
      <CompactButtonIcon as={Icon} />
    </CompactButtonRoot>
  );
});
CompactButton.displayName = 'CompactButton';

export { CompactButton, CompactButtonIcon as Icon, CompactButtonRoot as Root };
