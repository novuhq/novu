import React, { useState } from 'react';
import { Popover as MantinePopover, PopoverProps } from '@mantine/core';
import styled from 'styled-components';
import { INovuTheme } from '../../../store/novu-theme.context';

interface INovuPopoverProps {
  bell: (props: any) => JSX.Element;
  children: JSX.Element;
  theme: INovuTheme;
  offset?: number;
  position?: PopoverProps['position'];
  placement?: PopoverProps['placement'];
}

export function Popover({ children, bell, theme, offset, position = 'bottom', placement = 'end' }: INovuPopoverProps) {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  function handlerBellClick() {
    setIsVisible(!isVisible);
  }

  return (
    <MantinePopover
      opened={isVisible}
      onClose={() => setIsVisible(false)}
      target={<BellContainer onClick={handlerBellClick}> {bell({})}</BellContainer>}
      position={position}
      placement={placement}
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
