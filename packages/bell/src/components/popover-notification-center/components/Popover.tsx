import React, { useContext, useState } from 'react';
import { NovuContext } from '../../../store/novu-provider.context';
import { Popover as MantinePopover } from '@mantine/core';
import { colors } from '../../../shared/config/colors';
import styled from 'styled-components';
import { INotificationBellProps } from '../../notification-bell';

interface INovuPopoverProps {
  bell: (props: INotificationBellProps) => JSX.Element;
  children: JSX.Element;
  unseenCount: number;
}

export function Popover({ children, bell, ...props }: INovuPopoverProps) {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const { colorScheme } = useContext(NovuContext);
  const { unseenCount } = props;

  function handlerBellClick() {
    setIsVisible(!isVisible);
  }

  return (
    <MantinePopover
      opened={isVisible}
      onClose={() => setIsVisible(false)}
      target={<BellContainer onClick={handlerBellClick}> {bell({ unseenCount })}</BellContainer>}
      position={'bottom'}
      placement={'end'}
      withArrow
      styles={{
        inner: { margin: 0, padding: 0 },
        body: { border: 0 },
        popover: { background: `${colorScheme === 'dark' ? colors.B15 : colors.white}` },
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
