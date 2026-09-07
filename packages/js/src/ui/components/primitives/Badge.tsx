import { cva, VariantProps } from 'class-variance-authority';
import { splitProps } from 'solid-js';
import { JSX } from 'solid-js/jsx-runtime';
import { badgeStyles } from '../../core/style/tables';
import { cn, useStyle } from '../../helpers';
import type { AllAppearanceKey } from '../../types';

export const badgeVariants = cva(cn(badgeStyles.base), {
  variants: {
    variant: {
      secondary: badgeStyles.variants.secondary,
    },
    size: {
      default: badgeStyles.sizes.default,
    },
  },
  defaultVariants: {
    variant: 'secondary',
    size: 'default',
  },
});

type BadgeProps = JSX.IntrinsicElements['span'] & {
  appearanceKey?: AllAppearanceKey;
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
        key: local.appearanceKey || badgeStyles.key,
        className: cn(badgeVariants({ variant: props.variant, size: props.size }), local.class),
        context: local.context,
      })}
      {...rest}
    />
  );
};
