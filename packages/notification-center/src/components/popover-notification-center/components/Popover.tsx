import React, { useState } from 'react';
import { Popover as MantinePopover } from '@mantine/core';
import styled from 'styled-components';
import { useNovuThemeProvider } from '../../../hooks/use-novu-theme-provider.hook';

interface INovuPopoverProps {
  bell: (props: any) => JSX.Element;
  children: JSX.Element;
}

export function Popover({ children, bell }: INovuPopoverProps) {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const { theme } = useNovuThemeProvider();

  function handlerBellClick() {
    setIsVisible(!isVisible);
  }

  return (
    <MantinePopover
      opened={isVisible}
      onClose={() => setIsVisible(false)}
      target={<BellContainer onClick={handlerBellClick}> {bell({})}</BellContainer>}
      position={'bottom'}
      placement={'end'}
      withArrow
      styles={{
        inner: { margin: 0, padding: 0 },
        body: { border: 0 },
        popover: { background: `transparent` },
        arrow: {
          background: `${theme.popover.background}`,
          backgroundColor: `${theme.popover.background}`,
          borderColor: `${theme.popover.background}`,
        },
      }}
    >
      {children}
    </MantinePopover>
  );
}

const BellContainer = styled.span``;
