import { cva, VariantProps } from 'class-variance-authority';
import { splitProps } from 'solid-js';
import { JSX } from 'solid-js/jsx-runtime';
import { cn, useStyle } from '../../helpers';
import type { AppearanceKey } from '../../types';

export const inputVariants = cva(
  cn(
    `focus-visible:nt-outline-none focus-visible:nt-ring-2 focus-visible:nt-rounded-md focus-visible:nt-ring-ring focus-visible:nt-ring-offset-2`
  ),
  {
    variants: {
      variant: {
        default: 'nt-border nt-border-neutral-200 nt-rounded-md nt-p-1 nt-bg-background',
      },
      size: {
        default: 'nt-h-9',
        sm: 'nt-h-8 nt-text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

type InputProps = JSX.IntrinsicElements['input'] & { appearanceKey?: AppearanceKey } & VariantProps<
    typeof inputVariants
  >;
export const Input = (props: InputProps) => {
  const [local, rest] = splitProps(props, ['class', 'appearanceKey']);
  const style = useStyle();

  return (
    <input
      data-variant={props.variant}
      data-size={props.size}
      class={style({
        key: local.appearanceKey || 'input',
        className: cn(inputVariants({ variant: props.variant, size: props.size }), local.class),
      })}
      {...rest}
    />
  );
};
