import { Button, ButtonProps } from '@novu/novui';
import { css, cx } from '@novu/novui/css';
import { Box } from '@novu/novui/jsx';
import { FC } from 'react';
import { NavMenuFooter } from '../../../nav/NavMenuFooter';

export type SidebarFooterButtonProps = ButtonProps & {};

export const SidebarFooterButton: FC<SidebarFooterButtonProps> = ({ children, className, ...buttonProps }) => {
  return (
    <NavMenuFooter className={cx(css({ position: 'sticky', bottom: '0' }))}>
      {/* blur effect above button */}
      <Box
        h="75"
        width="full"
        bgGradient={'to-b'}
        gradientFrom={'surface.panel/00'}
        gradientTo={'surface.panel/100'}
        gradientToPosition={'80%'}
      />
      <Box bg="surface.panel">
        <Button
          fullWidth
          variant="outline"
          className={cx(
            css({
              '& .nv-button__label, & .nv-button__section': {
                '&, & svg': { color: 'typography.text.main !important', fill: 'typography.text.main !important' },
                WebkitTextFillColor: 'unset !important',
              },
            }),
            className
          )}
          {...buttonProps}
        >
          {children}
        </Button>
      </Box>
    </NavMenuFooter>
  );
};
