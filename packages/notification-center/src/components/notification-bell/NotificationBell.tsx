import React, { useContext } from 'react';
import { colors } from '../../shared/config/colors';
import { Bell as BellIcon, GradientDot } from '../../shared/icons';
import { ActionIcon } from '@mantine/core';
import styled from 'styled-components';
import { UnseenCountContext } from '../../store/unseen-count.context';
import { ColorScheme } from '../../index';
import { ISvgStopColor } from '../../store/novu-theme.context';
import { useDefaultBellColors } from '../../hooks';

const headerIconsSettings = { color: colors.B60, width: 30, height: 30 };

export interface INotificationBellProps {
  unseenCount?: number;
  unseenBadgeColor?: string | ISvgStopColor;
  unseenBadgeBackgroundColor?: string;
  colorScheme?: ColorScheme;
}

export function NotificationBell(props: INotificationBellProps) {
  const { unseenCount } = useContext(UnseenCountContext);
  const { bellColors } = useDefaultBellColors({
    unseenBadgeColor: props?.unseenBadgeColor,
    unseenBadgeBackgroundColor: props?.unseenBadgeBackgroundColor,
    colorScheme: props?.colorScheme,
  });

  return (
    <ActionIcon variant="transparent">
      <BellIcon {...headerIconsSettings} />
      {unseenCount.count > 0 ? <StyledGradientDot bellColors={bellColors} /> : null}
    </ActionIcon>
  );
}

export function GradientDotWrap({ bellColors, ...props }) {
  return <GradientDot {...props} bellColors={bellColors} />;
}

const StyledGradientDot = styled(GradientDotWrap)`
  position: absolute;
  top: -3%;
  right: 10%;
  width: 12px;
  height: 12px;
`;
