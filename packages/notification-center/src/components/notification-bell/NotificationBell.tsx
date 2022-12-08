import React from 'react';
import { ActionIcon } from '@mantine/core';
import styled from 'styled-components';
import { colors, ColorScheme } from '../../shared/config/colors';
import { Bell as BellIcon, GradientDot } from '../../shared/icons';
import { useDefaultBellColors, useUnseenCount } from '../../hooks';
import type { ISvgStopColor } from '../../store/novu-theme.context';

const headerIconsSettings = { color: colors.B60, width: 30, height: 30 };

export interface INotificationBellProps {
  unseenCount?: number;
  unseenBadgeColor?: string | ISvgStopColor;
  unseenBadgeBackgroundColor?: string;
  colorScheme?: ColorScheme;
}

export function NotificationBell(props: INotificationBellProps) {
  const { unseenCount } = useUnseenCount();
  const { bellColors } = useDefaultBellColors({
    bellColors: {
      unseenBadgeColor: props?.unseenBadgeColor,
      unseenBadgeBackgroundColor: props?.unseenBadgeBackgroundColor,
    },
    colorScheme: props?.colorScheme,
  });

  return (
    <ActionIcon variant="transparent" data-test-id="notification-bell">
      <BellIcon {...headerIconsSettings} />
      {unseenCount > 0 ? <StyledGradientDot bellColors={bellColors} /> : null}
    </ActionIcon>
  );
}

export function GradientDotWrap({ bellColors, ...props }) {
  return <GradientDot {...props} colors={bellColors} />;
}

const StyledGradientDot = styled(GradientDotWrap)`
  position: absolute;
  top: -3%;
  right: 10%;
  width: 12px;
  height: 12px;
`;
