import { Slot } from '@radix-ui/react-slot';
import * as React from 'react';

import { PolymorphicComponentProps } from '@/utils/polymorphic';
import { recursiveCloneChildren } from '@/utils/recursive-clone-children';
import { tv, type VariantProps } from '@/utils/tv';

const BUTTON_GROUP_ROOT_NAME = 'ButtonGroupRoot';
const BUTTON_GROUP_ITEM_NAME = 'ButtonGroupItem';
const BUTTON_GROUP_ICON_NAME = 'ButtonGroupIcon';

export const buttonGroupVariants = tv({
  slots: {
    root: 'flex -space-x-[1.5px]',
    item: [
      // base
      'group relative flex items-center justify-center whitespace-nowrap bg-bg-white text-center text-text-sub outline-none',
      'border border-stroke-soft',
      'transition duration-200 ease-out',
      // hover
      'hover:bg-bg-weak',
      // focus
      'focus:bg-bg-weak focus:outline-none',
      // active
      'data-[state=on]:bg-bg-weak',
      'data-[state=on]:text-text-strong',
      // disabled
      'disabled:pointer-events-none disabled:bg-bg-weak',
      'disabled:text-text-disabled',
    ],
    icon: 'shrink-0',
  },
  variants: {
    size: {
      sm: {
        item: [
          // base
          'h-9 gap-4 px-4 text-label-sm',
          // radius
          'first:rounded-l-lg last:rounded-r-lg',
        ],
        icon: [
          // base
          '-mx-2 size-5',
        ],
      },
      xs: {
        item: [
          // base
          'h-8 gap-3.5 px-3.5 text-label-sm',
          // radius
          'first:rounded-l-lg last:rounded-r-lg',
        ],
        icon: [
          // base
          '-mx-2 size-5',
        ],
      },
      '2xs': {
        item: [
          // base
          'h-6 gap-3 px-3 text-label-xs',
          // radius
          'first:rounded-l-md last:rounded-r-md',
        ],
        icon: [
          // base
          '-mx-2 size-4',
        ],
      },
    },
  },
  defaultVariants: {
    size: 'sm',
  },
});

type ButtonGroupSharedProps = VariantProps<typeof buttonGroupVariants>;

type ButtonGroupRootProps = VariantProps<typeof buttonGroupVariants> &
  React.HTMLAttributes<HTMLDivElement> & {
    asChild?: boolean;
  };

const ButtonGroupRoot = React.forwardRef<HTMLDivElement, ButtonGroupRootProps>(
  ({ asChild, children, className, size, ...rest }, forwardedRef) => {
    const uniqueId = React.useId();
    const Component = asChild ? Slot : 'div';
    const { root } = buttonGroupVariants({ size });

    const sharedProps: ButtonGroupSharedProps = {
      size,
    };

    const extendedChildren = recursiveCloneChildren(
      children as React.ReactElement[],
      sharedProps,
      [BUTTON_GROUP_ITEM_NAME, BUTTON_GROUP_ICON_NAME],
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
ButtonGroupRoot.displayName = BUTTON_GROUP_ROOT_NAME;

type ButtonGroupItemProps = ButtonGroupSharedProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    asChild?: boolean;
  };

const ButtonGroupItem = React.forwardRef<HTMLButtonElement, ButtonGroupItemProps>(
  ({ children, className, size, asChild, ...rest }, forwardedRef) => {
    const Component = asChild ? Slot : 'button';
    const { item } = buttonGroupVariants({ size });

    return (
      <Component ref={forwardedRef} className={item({ class: className })} {...rest}>
        {children}
      </Component>
    );
  }
);
ButtonGroupItem.displayName = BUTTON_GROUP_ITEM_NAME;

function ButtonGroupIcon<T extends React.ElementType>({
  className,
  size,
  as,
  ...rest
}: PolymorphicComponentProps<T, ButtonGroupSharedProps>) {
  const Component = as || 'div';
  const { icon } = buttonGroupVariants({ size });

  return <Component className={icon({ class: className })} {...rest} />;
}
ButtonGroupIcon.displayName = BUTTON_GROUP_ICON_NAME;

export { ButtonGroupIcon, ButtonGroupItem, ButtonGroupRoot };
