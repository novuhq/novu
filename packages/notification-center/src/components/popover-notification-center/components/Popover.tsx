import React, { useState, useMemo } from 'react';
import { Popover as MantinePopover, PopoverProps } from '@mantine/core';
import styled from 'styled-components';
import { INovuTheme } from '../../../store/novu-theme.context';
import { useNotifications } from '../../../hooks';
import { useFeed } from '../../../hooks/use-feed.hook';

type PositionType = [PopoverProps['position'], PopoverProps['placement']];
interface INovuPopoverProps {
  bell: (props: any) => JSX.Element;
  children: JSX.Element;
  theme: INovuTheme;
  offset?: number;
  position?: PopoverProps['position'] | `${PopoverProps['position']}-${PopoverProps['placement']}`;
}

export function Popover({ children, bell, theme, offset, position = 'bottom' }: INovuPopoverProps) {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  const { activeTabStoreId } = useFeed();
  const { markNotificationsAsSeen, onWidgetClose } = useNotifications({ storeId: activeTabStoreId });

  function handlerBellClick() {
    if (isVisible) {
      markNotificationsAsSeen(true);
      onWidgetClose();
    }
    setIsVisible(!isVisible);
  }

  function handlerOnClose() {
    setIsVisible(false);
    markNotificationsAsSeen(true);
    onWidgetClose();
  }

  const [modPosition, modPlacement] = useMemo<PositionType>(() => {
    if (position.includes('-')) {
      return position.split('-') as PositionType;
    }

    return [position, 'end'] as PositionType;
  }, [position]);

  return (
    <MantinePopover
      opened={isVisible}
      onClose={handlerOnClose}
      target={<BellContainer onClick={handlerBellClick}> {bell({})}</BellContainer>}
      position={modPosition}
      placement={modPlacement}
      withArrow
      styles={{
        inner: { margin: 0, padding: 0 },
        body: { border: 0 },
        popover: { background: `transparent` },
        arrow: {
          background: `${theme.popover?.arrowColor}`,
          backgroundColor: `${theme.popover?.arrowColor}`,
          borderColor: `${theme.popover?.arrowColor}`,
        },
      }}
      gutter={offset}
    >
      {children}
    </MantinePopover>
  );
}

const BellContainer = styled.span``;
