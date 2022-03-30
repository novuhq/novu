import styled, { css } from 'styled-components';
import { IMessage } from '@novu/shared';
import moment from 'moment';
import { lighten } from 'polished';

export function NotificationListItem({
  notification,
  onClick,
}: {
  notification: IMessage;
  onClick: (notification: IMessage) => void;
}) {
  return (
    <ItemWrapper
      data-test-id="notification-list-item"
      unseen={!notification.seen}
      onClick={() => onClick(notification)}>
      <TextContent
        data-test-id="notification-content"
        dangerouslySetInnerHTML={{
          __html: notification.content as string,
        }}
      />
      <BottomBar>
        <TimeMark>{moment(notification.createdAt).fromNow()}</TimeMark>
      </BottomBar>
    </ItemWrapper>
  );
}

const BottomBar = styled.div`
  display: flex;
`;

const TextContent = styled.div`
  line-height: 16px;
`;

const unseenStyleNotificationStyles = css`
  background: ${({ theme }) => {
    return lighten(0.6, theme.colors.main);
  }};
  border-bottom: 1px solid #f9f9f9;

  &:last-child {
    border-bottom: none;
  }

  &:before {
    content: '';
    position: absolute;
    left: 0;
    top: 2px;
    width: 3px;
    border-radius: 2px;
    background: ${({ theme }) => theme.colors.main};
    height: calc(100% - 4px);
  }
`;

const ItemWrapper = styled.div<{ unseen?: boolean }>`
  padding: 15px;
  border-bottom: 1px solid #edf2f9;
  position: relative;
  font-size: 12px;
  justify-content: space-between;
  align-items: center;

  &:hover {
    cursor: pointer;
  }

  ${({ unseen }) => {
    return unseen ? unseenStyleNotificationStyles : null;
  }}
`;

const TimeMark = styled.div`
  min-width: 55px;
  font-size: 10px;
  opacity: 0.5;
  margin-top: 5px;
`;
