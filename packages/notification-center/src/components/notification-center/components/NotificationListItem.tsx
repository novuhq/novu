import styled, { css } from 'styled-components';
import { IMessage } from '@novu/shared';
import moment from 'moment';
import { colors } from '../../../shared/config/colors';
import { DotsHorizontal } from '../../../shared/icons';
import React from 'react';
import { INovuTheme } from '../../../store/novu-theme.context';
import { useNovuThemeProvider } from '../../../hooks/use-novu-theme-provider.hook';

export function NotificationListItem({
  notification,
  onClick,
}: {
  notification: IMessage;
  onClick: (notification: IMessage) => void;
}) {
  const { theme: novuTheme } = useNovuThemeProvider();

  return (
    <ItemWrapper
      novuTheme={novuTheme}
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

const unseenNotificationStyles = css<{ novuTheme: INovuTheme }>`
  background: ${({ novuTheme }) => novuTheme.unseenNotificationBackground};
  box-shadow: ${({ novuTheme }) => novuTheme.unseenNotificationBoxShadow};
  color: ${({ novuTheme }) => novuTheme.seenNotificationFontColor};
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
const seenNotificationStyles = css<{ novuTheme: INovuTheme }>`
  color: ${({ novuTheme }) => novuTheme.seenNotificationFontColor};
  font-weight: 400;
  font-size: 14px;
`;

const ItemWrapper = styled.div<{ unseen?: boolean; novuTheme: INovuTheme }>`
  padding: 14px 15px 14px 15px;
  position: relative;
  display: flex;
  line-height: 20px;
  justify-content: space-between;
  align-items: center;
  border-radius: 7px;
  margin: 10px 15px;
  background: ${({ novuTheme }) => novuTheme.seenNotificationBackground};

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
