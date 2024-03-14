import { Button, IButtonProps } from '@novu/design-system';
import { PropsWithChildren } from 'react';
import { css, cx } from '../styled-system/css';

const iconButtonStyles = css({
  padding: 0,
  backgroundImage: 'none',
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
});

export type IIconButtonProps = IButtonProps;

/**
 * Clickable Icon Button. Pass the desired Icon* as a child
 *
 * TODO: this should eventually be extracted to design-system, but we don't have a proper specification yet.
 */
export const IconButton: React.FC<PropsWithChildren<IIconButtonProps>> = ({ children, className, ...buttonProps }) => {
  return (
    <Button {...buttonProps} className={cx(iconButtonStyles, className)}>
      {children}
    </Button>
  );
};
