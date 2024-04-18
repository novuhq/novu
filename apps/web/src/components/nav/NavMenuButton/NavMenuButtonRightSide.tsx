import { Transition } from '@mantine/core';
import { Tooltip } from '@novu/design-system';
import { FC, PropsWithChildren, useState } from 'react';
import { css } from '../../../styled-system/css';
import { INavMenuButtonRightSideConfig } from './NavMenuButton.shared';

const tooltipStyle = css({
  backgroundColor: 'surface.popover',
  color: 'typography.text.main',
  border: 'none',
});

export type INavMenuButtonRightSideProps = PropsWithChildren<
  Omit<INavMenuButtonRightSideConfig, 'node' | 'triggerOn'>
> & {
  isMounted: boolean;
};

export const NavMenuRightSide: FC<INavMenuButtonRightSideProps> = ({ children, tooltip, isMounted }) => {
  const [isHovered, setIsHovered] = useState<boolean>(false);

  return (
    <Transition mounted={isMounted} transition="fade" duration={400} timingFunction="ease">
      {(styles) => (
        <Tooltip
          classNames={{ tooltip: tooltipStyle }}
          label={tooltip}
          // only open if there is content and the trigger is currently hovered
          opened={!!tooltip && isHovered}
          position="right"
          withinPortal
        >
          <div style={styles} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
            {children}
          </div>
        </Tooltip>
      )}
    </Transition>
  );
};
