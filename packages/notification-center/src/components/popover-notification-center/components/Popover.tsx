import React, { useContext, useState } from 'react';
import { Popover as MantinePopover } from '@mantine/core';
import { colors } from '../../../shared/config/colors';
import styled from 'styled-components';
import { ColorScheme } from '../../../index';

interface INovuPopoverProps {
  bell: (props: any) => JSX.Element;
  children: JSX.Element;
  colorScheme: ColorScheme;
}

export function Popover({ children, bell, colorScheme }: INovuPopoverProps) {
  const [isVisible, setIsVisible] = useState<boolean>(false);

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
          background: `${colorScheme === 'dark' ? colors.B15 : colors.white}`,
          backgroundColor: `${colorScheme === 'dark' ? colors.B15 : colors.white}`,
          borderColor: `${colorScheme === 'dark' ? colors.B15 : colors.white}`,
        },
      }}
    >
      {children}
    </MantinePopover>
  );
}

const BellContainer = styled.span``;
