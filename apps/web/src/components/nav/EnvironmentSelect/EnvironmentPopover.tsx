import { Popover, PopoverProps } from '@mantine/core';
import { IconClose } from '@novu/design-system';
import { MouseEventHandler, PropsWithChildren } from 'react';
import { popoverArrowStyle, popoverDropdownStyle, closeButtonStyles, linkStyles } from './EnvironmentPopover.styles';

interface IEnvironmentPopoverProps {
  handlePopoverLinkClick: MouseEventHandler;
  isPopoverOpened: boolean;
  setIsPopoverOpened: (newVal: boolean) => void;
  position?: PopoverProps['position'];
}

export const EnvironmentPopover: React.FC<PropsWithChildren<IEnvironmentPopoverProps>> = ({
  children,
  isPopoverOpened,
  setIsPopoverOpened,
  handlePopoverLinkClick,
  position = 'right',
}) => {
  return (
    <Popover
      classNames={{
        arrow: popoverArrowStyle,
        dropdown: popoverDropdownStyle,
      }}
      withArrow
      opened={isPopoverOpened}
      onClose={() => setIsPopoverOpened(false)}
      withinPortal={true}
      transition="rotate-left"
      transitionDuration={250}
      position={position}
      radius="md"
    >
      <Popover.Target>{children}</Popover.Target>
      <Popover.Dropdown>
        <div style={{ maxWidth: '220px', paddingRight: '10px' }}>
          <button className={closeButtonStyles} onClick={() => setIsPopoverOpened(false)} aria-label="Close popover">
            <IconClose />
          </button>
          {`To view the updates you've made, visit the `}
          <a className={linkStyles} onClick={handlePopoverLinkClick}>
            development changes
          </a>
          {'.'}
        </div>
      </Popover.Dropdown>
    </Popover>
  );
};
