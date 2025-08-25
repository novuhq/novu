import { cva, VariantProps } from 'class-variance-authority';
import { splitProps } from 'solid-js';
import { JSX } from 'solid-js/jsx-runtime';
import { cn, useStyle } from '../../helpers';
import type { AppearanceKey } from '../../types';

export const badgeVariants = cva(cn('nt-inline-flex nt-flex-row nt-gap-1 nt-items-center'), {
  variants: {
    variant: {
      secondary: 'nt-bg-neutral-alpha-50',
    },
    size: {
      default: 'nt-px-1 nt-py-px nt-rounded-sm nt-text-xs nt-px-1',
    },
  },
  defaultVariants: {
    variant: 'secondary',
    size: 'default',
  },
});

type BadgeProps = JSX.IntrinsicElements['span'] & {
  appearanceKey?: AppearanceKey;
  context?: Record<string, unknown>;
} & VariantProps<typeof badgeVariants>;
export const Badge = (props: BadgeProps) => {
  const [local, rest] = splitProps(props, ['class', 'appearanceKey', 'context']);
  const style = useStyle();

  return (
    <span
      data-variant={props.variant}
      data-size={props.size}
      class={style({
        key: local.appearanceKey || 'badge',
        className: cn(badgeVariants({ variant: props.variant, size: props.size }), local.class),
        context: local.context,
      })}
      {...rest}
    />
  );
};
