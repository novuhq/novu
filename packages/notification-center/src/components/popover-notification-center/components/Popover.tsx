import React, { useState } from 'react';
import { Popover as MantinePopover, PopoverProps, createStyles, MantineTheme } from '@mantine/core';
import styled from 'styled-components';
import { INovuTheme } from '../../../store/novu-theme.context';
import { useNotifications } from '../../../hooks';
import { useFeed } from '../../../hooks/use-feed.hook';

interface INovuPopoverProps {
  bell: (props: any) => JSX.Element;
  children: JSX.Element;
  theme: INovuTheme;
  offset?: number;
  position?: PopoverProps['position'];
}

export function Popover({ children, bell, theme, offset, position = 'bottom-end' }: INovuPopoverProps) {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const { classes } = usePopoverStyles(theme.popover?.arrowColor);
  const { activeTabStoreId } = useFeed();
  const { markAsSeen, onWidgetClose } = useNotifications({ storeId: activeTabStoreId });

  function handlerBellClick() {
    if (isVisible) {
      markAsSeen(null, true);
      onWidgetClose();
    }
    setIsVisible(!isVisible);
  }

  function handlerOnClose() {
    setIsVisible(false);
    markAsSeen(null, true);
    onWidgetClose();
  }

  return (
    <MantinePopover
      opened={isVisible}
      onClose={handlerOnClose}
      position={position}
      withArrow
      classNames={classes}
      offset={offset}
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
