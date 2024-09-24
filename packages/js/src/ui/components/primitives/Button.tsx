import { cva, VariantProps } from 'class-variance-authority';
import { splitProps } from 'solid-js';
import { JSX } from 'solid-js/jsx-runtime';
import { cn, useStyle } from '../../helpers';
import type { AppearanceKey } from '../../types';

export const buttonVariants = cva(
  'nt-inline-flex nt-gap-4 nt-items-center nt-justify-center nt-whitespace-nowrap nt-rounded-lg nt-text-sm nt-font-medium nt-ring-offset-background nt-transition-colors focus-visible:nt-outline-none focus-visible:nt-ring-2 focus-visible:nt-ring-primary nt-focus-visible:nt-ring-offset-2 disabled:nt-pointer-events-none disabled:nt-opacity-50',
  {
    variants: {
      variant: {
        default: 'nt-bg-primary nt-text-primary-foreground hover:nt-bg-primary-alpha-900',
        secondary: 'nt-bg-secondary nt-text-secondary-foreground hover:nt-bg-secondary-alpha-800',
        icon: 'nt-text-secondary-foreground-alpha-500 hover:nt-bg-neutral-alpha-50',
        ghost: 'hover:nt-bg-neutral-alpha-50',
        unstyled: '',
      },
      size: {
        none: '',
        icon: 'nt-p-1',
        default: 'nt-h-8 nt-px-3',
        sm: 'nt-h-7 nt-rounded-md nt-px-3',
        lg: 'nt-h-10 nt-px-8',
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
