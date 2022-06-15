import React, { useContext } from 'react';
import { colors } from '../../shared/config/colors';
import { Bell as BellIcon, GradientDot } from '../../shared/icons';
import { ActionIcon } from '@mantine/core';
import styled from 'styled-components';
import { UnseenCountContext } from '../../store/unseen-count.context';
import { INovuTheme } from '../../store/novu-theme.context';

const headerIconsSettings = { color: colors.B60, width: 30, height: 30 };

export interface INotificationBellProps {
  unseenCount?: number;
  theme: INovuTheme;
}

export function NotificationBell(props: INotificationBellProps) {
  const { unseenCount } = useContext(UnseenCountContext);

  return (
    <ActionIcon variant="transparent">
      <BellIcon {...headerIconsSettings} />
      {unseenCount > 0 ? <StyledGradientDot theme={props.theme} /> : null}
    </ActionIcon>
  );
}

export function GradientDotWrap({ theme, ...props }) {
  return <GradientDot {...props} theme={theme} />;
}

const StyledGradientDot = styled(GradientDotWrap)`
  position: absolute;
  top: -3%;
  right: 10%;
  width: 12px;
  height: 12px;
`;
