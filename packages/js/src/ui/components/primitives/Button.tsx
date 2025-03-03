import { cva, VariantProps } from 'class-variance-authority';
import { splitProps } from 'solid-js';
import { JSX } from 'solid-js/jsx-runtime';
import { cn, useStyle } from '../../helpers';
import type { AppearanceKey } from '../../types';

export const buttonVariants = cva(
  cn(
    'nt-inline-flex nt-gap-4 nt-items-center nt-justify-center nt-whitespace-nowrap nt-text-sm nt-font-medium nt-transition-colors disabled:nt-pointer-events-none disabled:nt-opacity-50 after:nt-absolute after:nt-content-[""] before:nt-content-[""] before:nt-absolute [&_svg]:nt-pointer-events-none [&_svg]:nt-shrink-0',
    `focus-visible:nt-outline-none focus-visible:nt-ring-2 focus-visible:nt-rounded-md focus-visible:nt-ring-ring focus-visible:nt-ring-offset-2`
  ),
  {
    variants: {
      variant: {
        default:
          'nt-bg-gradient-to-b nt-from-20% nt-from-primary-foreground-alpha-200 nt-to-transparent nt-bg-primary nt-text-primary-foreground nt-shadow-[0_0_0_0.5px_var(--nv-color-primary-600)] nt-relative before:nt-absolute before:nt-inset-0 before:nt-border before:nt-border-primary-foreground-alpha-100 after:nt-absolute after:nt-inset-0 after:nt-opacity-0 hover:after:nt-opacity-100 after:nt-transition-opacity after:nt-bg-gradient-to-b after:nt-from-primary-foreground-alpha-50 after:nt-to-transparent',
        secondary:
          'nt-bg-secondary nt-text-secondary-foreground nt-shadow-[0_0_0_0.5px_var(--nv-color-secondary-600)] nt-relative before:nt-absolute before:nt-inset-0 before:nt-border before:nt-border-secondary-foreground-alpha-100 after:nt-absolute after:nt-inset-0 after:nt-opacity-0 hover:after:nt-opacity-100 after:nt-transition-opacity after:nt-bg-gradient-to-b after:nt-from-secondary-foreground-alpha-50 after:nt-to-transparent',
        ghost: 'hover:nt-bg-neutral-alpha-100 nt-text-foreground-alpha-600 hover:nt-text-foreground-alpha-800',
        unstyled: '',
      },
      size: {
        none: '',
        iconSm: 'nt-p-1 nt-rounded-md after:nt-rounded-md before:nt-rounded-md focus-visible:nt-rounded-md',
        icon: 'nt-p-2.5 nt-rounded-xl before:nt-rounded-xl after:nt-rounded-xl focus-visible:nt-rounded-xl',
        default: 'nt-px-2 nt-py-1 nt-rounded-lg focus-visible:nt-rounded-lg before:nt-rounded-lg after:nt-rounded-lg',
        sm: 'nt-px-1 nt-py-px nt-rounded-md nt-text-xs nt-px-1 before:nt-rounded-md focus-visible:nt-rounded-md after:nt-rounded-md',
        lg: 'nt-px-8 nt-py-2 nt-text-base before:nt-rounded-lg after:nt-rounded-lg focus-visible:nt-rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

type ButtonProps = JSX.IntrinsicElements['button'] & { appearanceKey?: AppearanceKey } & VariantProps<
    typeof buttonVariants
  >;
export const Button = (props: ButtonProps) => {
  const [local, rest] = splitProps(props, ['class', 'appearanceKey']);
  const style = useStyle();

  return (
    <button
      data-variant={props.variant}
      data-size={props.size}
      class={style(
        local.appearanceKey || 'button',
        cn(buttonVariants({ variant: props.variant, size: props.size }), local.class)
      )}
      {...rest}
    />
  );
};
