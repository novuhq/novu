import { CorePropsWithChildren } from '@novu/novui';
import { css, cx } from '@novu/novui/css';
import { Box, Stack } from '@novu/novui/jsx';
import { FC } from 'react';
import { NavMenuFooter } from '../../../nav/NavMenuFooter';

export type SidebarFooterProps = CorePropsWithChildren;

export const SidebarFooter: FC<SidebarFooterProps> = ({ children, className }) => {
  return (
    <NavMenuFooter className={cx(css({ position: 'sticky', bottom: '0' }), className)}>
      {/* blur effect above button */}
      <Box
        h="75"
        width="full"
        bgGradient={'to-b'}
        gradientFrom={'surface.panel/00'}
        gradientTo={'surface.panel/100'}
        gradientToPosition={'80%'}
      />
      <Stack bg="surface.panel" gap="0">
        {children}
      </Stack>
    </NavMenuFooter>
  );
};
