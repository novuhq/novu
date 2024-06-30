import { LocalizedMessage, Text } from '@novu/novui';
import { cva, cx, type RecipeVariant } from '@novu/novui/css';
import { hstack } from '@novu/novui/patterns';
import { SystemStyleObject } from '@novu/novui/types';
import { type ForwardedRef, forwardRef } from 'react';
import { ConnectionStatus } from '../../../../studio/types';

const CONNECTION_STATUS_LABEL_LOOKUP: Record<ConnectionStatus, LocalizedMessage> = {
  connected: 'Connected',
  disconnected: 'Disconnected',
  loading: 'Loading...',
};

const statusRecipe = cva<{
  status: Record<ConnectionStatus, SystemStyleObject>;
}>({
  base: {
    width: '50',
    height: '50',
    outline: '[4px solid]',
    borderRadius: 'circle',
  },
  variants: {
    status: {
      connected: {
        bg: 'typography.text.feedback.success',
        // this 'color/number' syntax uses color-mix to achieve a 20% opacity
        outlineColor: 'typography.text.feedback.success/20',
      },
      disconnected: {
        bg: 'typography.text.feedback.alert',
        outlineColor: 'typography.text.feedback.alert/20',
      },
      loading: {
        bg: 'typography.text.feedback.info',
        outlineColor: 'typography.text.feedback.info/20',
      },
    },
  },
});

export type ConnectionStatusIndicatorProps = RecipeVariant<typeof statusRecipe> &
  React.ButtonHTMLAttributes<HTMLButtonElement>;

export const ConnectionStatusIndicator = forwardRef(
  ({ status, className, ...buttonProps }: ConnectionStatusIndicatorProps, ref: ForwardedRef<HTMLButtonElement>) => {
    return (
      <button {...buttonProps} className={cx(hstack({ gap: '50', cursor: 'pointer' }), className)} ref={ref}>
        <div className={statusRecipe({ status })} />
        <Text color="typography.text.secondary">{CONNECTION_STATUS_LABEL_LOOKUP[status]}</Text>
      </button>
    );
  }
);
