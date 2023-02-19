import React from 'react';
import { ActionIcon } from '@mantine/core';
import styled from '@emotion/styled';
import { cx, css } from '@emotion/css';

import { colors, ColorScheme } from '../../shared/config/colors';
import { Bell as BellIcon, GradientDot } from '../../shared/icons';
import { useNotifications } from '../../hooks';
import { getDefaultBellColors } from '../../utils/defaultTheme';
import type { ISvgStopColor } from '../../store/novu-theme.context';
import { useStyles } from '../../store/styles';

const headerIconsSettings = { color: colors.B60, width: 30, height: 30 };

export interface INotificationBellProps {
  unseenCount?: number;
  unseenBadgeColor?: string | ISvgStopColor;
  unseenBadgeBackgroundColor?: string;
  colorScheme?: ColorScheme;
}

export function NotificationBell(props: INotificationBellProps) {
  const { unseenCount } = useNotifications();
  const { bellColors } = getDefaultBellColors({
    bellColors: {
      unseenBadgeColor: props?.unseenBadgeColor,
      unseenBadgeBackgroundColor: props?.unseenBadgeBackgroundColor,
    },
    colorScheme: props?.colorScheme,
  });
  const [bellButtonStyles, bellDotStyles] = useStyles(['bellButton.root', 'bellButton.dot']);

  return (
    <ActionIcon
      variant="transparent"
      className={cx('nc-bell-button', css(bellButtonStyles))}
      data-test-id="notification-bell"
    >
      <BellIcon {...headerIconsSettings} />
      {unseenCount > 0 ? (
        <StyledGradientDot bellColors={bellColors} className={cx('nc-bell-button-dot', css(bellDotStyles))} />
      ) : null}
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
