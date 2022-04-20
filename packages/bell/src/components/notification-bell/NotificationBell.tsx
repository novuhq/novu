import React, { useContext } from 'react';
import { colors } from '../../shared/config/colors';
import { Bell as BellIcon, GradientDot } from '../../shared/icons';
import { ActionIcon } from '@mantine/core';
import { NovuContext } from '../../store/novu-provider.context';
import styled from 'styled-components';
import { UnseenCountContext } from '../../store/unseen-count.context';

const headerIconsSettings = { color: colors.B60, width: 30, height: 30 };

export interface INotificationBellProps {
  unseenCount?: number;
}

export function NotificationBell(props: INotificationBellProps) {
  const { unseenCount } = useContext(UnseenCountContext);
  const { bellLoading } = useContext(NovuContext);

  if (bellLoading) {
    bellLoading(false);
  }

  return (
    <ActionIcon variant="transparent">
      <BellIcon {...headerIconsSettings} />
      {unseenCount > 0 ? <StyledGradientDot /> : null}
    </ActionIcon>
  );
}

export function GradientDotWrap(props: any) {
  const { colorScheme } = useContext(NovuContext);
  const borderColor = colorScheme === 'dark' ? colors.B15 : colors.white;

  return <GradientDot {...props} color={borderColor} />;
}

const StyledGradientDot = styled(GradientDotWrap)`
  position: absolute;
  top: -3%;
  right: 10%;
  width: 12px;
  height: 12px;
`;
