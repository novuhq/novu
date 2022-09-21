import React, { useState } from 'react';
import { Popover as MantinePopover } from '@mantine/core';
import styled from 'styled-components';
import { INovuTheme } from '../../../store/novu-theme.context';
import { useNotifications } from '../../../hooks';
import { useFeed } from '../../../hooks/use-feed.hook';

interface INovuPopoverProps {
  bell: (props: any) => JSX.Element;
  children: JSX.Element;
  theme: INovuTheme;
}

export function Popover({ children, bell, theme }: INovuPopoverProps) {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  const { activeTabStoreId } = useFeed();
  const { markNotificationsAsSeen } = useNotifications({ storeId: activeTabStoreId });

  function handlerBellClick() {
    if (isVisible) {
      markNotificationsAsSeen();
    }
    setIsVisible(!isVisible);
  }

  function handlerOnClose() {
    setIsVisible(false);
    markNotificationsAsSeen();
  }

  return (
    <MantinePopover
      opened={isVisible}
      onClose={handlerOnClose}
      target={<BellContainer onClick={handlerBellClick}> {bell({})}</BellContainer>}
      position={'bottom'}
      placement={'end'}
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
    >
      {children}
    </MantinePopover>
  );
}

const BellContainer = styled.span``;
