import React, { useContext } from 'react';
import { colors } from '../../shared/config/colors';
import { Bell as BellIcon, GradientDot } from '../../shared/icons';
import { ActionIcon } from '@mantine/core';
import styled from 'styled-components';
import { UnseenCountContext } from '../../store/unseen-count.context';
import { useNovuThemeProvider } from '../../hooks/use-novu-theme-provider.hook';

const headerIconsSettings = { color: colors.B60, width: 30, height: 30 };

export interface INotificationBellProps {
  unseenCount?: number;
}

export function NotificationBell(props: INotificationBellProps) {
  const { unseenCount } = useContext(UnseenCountContext);
  const { theme } = useNovuThemeProvider();

  return (
    <ActionIcon variant="transparent">
      <BellIcon {...headerIconsSettings} />
      {unseenCount > 0 ? <StyledGradientDot theme={theme} /> : null}
    </ActionIcon>
  );
}

export function GradientDotWrap({ theme, ...props }) {
  return <GradientDot {...props} color={theme.bellGradientDot.color} />;
}

const StyledGradientDot = styled(GradientDotWrap)`
  position: absolute;
  top: -3%;
  right: 10%;
  width: 12px;
  height: 12px;
`;
