import React, { useState } from 'react';
import { Popover as MantinePopover, PopoverProps, createStyles, MantineTheme } from '@mantine/core';
import styled from '@emotion/styled';
import { css } from '@emotion/css';

import { INovuTheme } from '../../../store/novu-theme.context';
import { useStyles } from '../../../store/styles';
import { useNotifications } from '../../../hooks';

interface INovuPopoverProps {
  bell: (props: any) => JSX.Element;
  children: JSX.Element;
  theme: INovuTheme;
  offset?: number;
  position?: PopoverProps['position'];
}

export function Popover({ children, bell, theme, offset = 0, position = 'bottom-end' }: INovuPopoverProps) {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const { cx, classes } = usePopoverStyles(theme.popover?.arrowColor);
  const [popoverArrowStyles, popoverDropdownStyles] = useStyles(['popover.arrow', 'popover.dropdown']);
  const overrideClasses: Record<'dropdown' | 'arrow', string> = {
    arrow: cx(classes.arrow, css(popoverArrowStyles)),
    dropdown: cx(classes.dropdown, css(popoverDropdownStyles)),
  };
  const { markFetchedNotificationsAsSeen } = useNotifications();

  function handlerBellClick() {
    if (isVisible) {
      markFetchedNotificationsAsSeen();
    }
    setIsVisible(!isVisible);
  }

  function handlerOnClose() {
    setIsVisible(false);
    markFetchedNotificationsAsSeen();
  }

  return (
    <MantinePopover
      opened={isVisible}
      onClose={handlerOnClose}
      position={position}
      withArrow
      classNames={overrideClasses}
      offset={offset}
      withinPortal
    >
      <MantinePopover.Target>
        <BellContainer onClick={handlerBellClick}> {bell({})}</BellContainer>
      </MantinePopover.Target>
      <MantinePopover.Dropdown> {children}</MantinePopover.Dropdown>
    </MantinePopover>
  );
}

const BellContainer = styled.span``;

const usePopoverStyles = createStyles((theme: MantineTheme, arrowColor: string) => ({
  dropdown: {
    padding: '0px',
    backgroundColor: 'transparent',
    border: 'none',
  },
  arrow: {
    background: arrowColor,
    backgroundColor: arrowColor,
    borderColor: arrowColor,
  },
}));
