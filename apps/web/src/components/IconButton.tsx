import { ComponentProps, PropsWithChildren } from 'react';
import { Tooltip, Button, IButtonProps } from '@novu/design-system';

import { useHover } from '../hooks';
import { css, cx } from '../styled-system/css';

// Mantine styles take precedence over Panda :(, so have to use !important
const iconButtonStyles = css({
  padding: '0 !important',
  backgroundImage: 'none !important',
  background: 'transparent',
  height: 'inherit',
  border: 'none',
  cursor: 'pointer',

  '& span': {
    backgroundImage: 'none',
  },
  '& svg': {
    fill: 'typography.text.secondary',
  },
  '&:disabled svg': {
    opacity: '40%',
  },

  _hover: {
    '& svg': {
      fill: 'typography.text.tertiary',
    },
  },
});

export interface IIconButtonProps extends IButtonProps {
  tooltipProps?: Omit<ComponentProps<typeof Tooltip>, 'children'>;
}

/**
 * Clickable Icon Button. Pass the desired Icon* as a child
 *
 * TODO: this should eventually be extracted to design-system, but we don't have a proper specification yet.
 */
export const IconButton: React.FC<PropsWithChildren<IIconButtonProps>> = ({
  children,
  className,
  tooltipProps,
  ...buttonProps
}) => {
  const { isHovered, ...elementProps } = useHover();

  return !!tooltipProps ? (
    <Tooltip opened={isHovered} {...tooltipProps}>
      <Button {...elementProps} {...buttonProps} className={cx(iconButtonStyles, className)}>
        {children}
      </Button>
    </Tooltip>
  ) : (
    <Button {...buttonProps} className={cx(iconButtonStyles, className)}>
      {children}
    </Button>
  );
};
