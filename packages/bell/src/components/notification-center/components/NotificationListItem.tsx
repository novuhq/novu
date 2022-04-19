import styled, { css } from 'styled-components';
import { IMessage } from '@novu/shared';
import moment from 'moment';
import { shadows } from '../../../shared/config/shadows';
import { colors } from '../../../shared/config/colors';
import { DotsHorizontal } from '../../../shared/icons';
import React, { useContext } from 'react';
import { NovuContext } from '../../../store/novu-provider.context';
import { ColorScheme } from '../../../index';

export function NotificationListItem({
  notification,
  onClick,
}: {
  notification: IMessage;
  onClick: (notification: IMessage) => void;
}) {
  const { colorScheme } = useContext(NovuContext);

  return (
    <ItemWrapper
      colorScheme={colorScheme}
      data-test-id="notification-list-item"
      unseen={!notification.seen}
      onClick={() => onClick(notification)}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'left' }}>
        <TextContent
          data-test-id="notification-content"
          dangerouslySetInnerHTML={{
            __html: notification.content as string,
          }}
        />
        <div>
          <TimeMark unseen={!notification.seen}>{moment(notification.createdAt).fromNow()}</TimeMark>
        </div>
      </div>
      <SettingsActionWrapper style={{ display: 'none' }}>
        <DotsHorizontal />
      </SettingsActionWrapper>
    </ItemWrapper>
  );
}

const TextContent = styled.div`
  line-height: 16px;
`;
const SettingsActionWrapper = styled.div`
  color: ${({ theme }) => theme.colors.secondaryFontColor};
`;

const unseenNotificationStyles = css<{ colorScheme: ColorScheme }>`
  background: ${({ colorScheme }) => (colorScheme === 'light' ? colors.white : colors.B20)};
  box-shadow: ${({ colorScheme }) => (colorScheme === 'light' ? shadows.medium : shadows.dark)};
  font-weight: 700;

  &:before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    width: 5px;
    border-radius: 7px 0 0 7px;
    background: ${({ theme }) => theme.colors.main};
  }
`;
const seenNotificationStyles = css`
  color: ${colors.B60};
  font-weight: 400;
  font-size: 14px;
`;

const ItemWrapper = styled.div<{ unseen?: boolean; colorScheme: ColorScheme }>`
  padding: 14px 15px 14px 15px;
  position: relative;
  display: flex;
  line-height: 20px;
  justify-content: space-between;
  align-items: center;
  border-radius: 7px;
  margin: 10px 15px;
  background: ${({ colorScheme }) => (colorScheme === 'light' ? colors.B98 : colors.B17)};

  &:hover {
    cursor: pointer;
  }

  ${({ unseen }) => {
    return unseen ? unseenNotificationStyles : seenNotificationStyles;
  }}
`;

const TimeMark = styled.div<{ unseen?: boolean }>`
  min-width: 55px;
  font-size: 12px;
  font-weight: 400;
  opacity: 0.5;
  line-height: 14.4px;
  color: ${({ unseen, theme }) => (unseen ? colors.B60 : theme.colors.secondaryFontColor)};
`;
