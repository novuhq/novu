import React from 'react';
import styled, { css } from 'styled-components';
import { formatDistanceToNow } from 'date-fns';
import { IMessage, ButtonTypeEnum, IMessageAction, MessageActionStatusEnum } from '@novu/shared';
import { DotsHorizontal, GradientDot } from '../../../../shared/icons';
import { useNovuTheme, useNotificationCenter, useDefaultBellColors } from '../../../../hooks';
import { ActionContainer } from './ActionContainer';
import { useTranslations } from 'packages/notification-center/src/hooks/use-translations';
import { INovuTheme } from '../../../../store/novu-theme.context';
import { When } from '../../../../shared/utils/When';
import { ColorScheme } from '../../../../shared/config/colors';

export function NotificationListItem({
  notification,
  onClick,
}: {
  notification: IMessage;
  onClick: (notification: IMessage, actionButtonType?: ButtonTypeEnum) => void;
}) {
  const { theme: novuTheme, colorScheme } = useNovuTheme();
  const { onActionClick, listItem } = useNotificationCenter();
  const { dateFnsLocale } = useTranslations();

  function handleNotificationClick() {
    onClick(notification);
  }

  async function handleActionButtonClick(actionButtonType: ButtonTypeEnum) {
    onActionClick(notification.templateIdentifier, actionButtonType, notification);
  }

  if (listItem) {
    return listItem(notification, handleActionButtonClick, handleNotificationClick);
  }

  return (
    <ItemWrapper
      novuTheme={novuTheme}
      data-test-id="notification-list-item"
      unread={readSupportAdded(notification) ? !notification.read : !notification.seen}
      onClick={() => handleNotificationClick()}
    >
      <NotificationItemContainer>
        <TextContent
          data-test-id="notification-content"
          dangerouslySetInnerHTML={{
            __html: notification.content as string,
          }}
        />
        <TimeMark novuTheme={novuTheme} unseen={!notification.seen}>
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: dateFnsLocale() })}
        </TimeMark>
        <ActionWrapper
          templateIdentifier={notification.templateIdentifier}
          actionStatus={notification?.cta?.action?.status}
          ctaAction={notification?.cta?.action}
          handleActionButtonClick={handleActionButtonClick}
        />
      </NotificationItemContainer>
      <SettingsActionWrapper style={{ display: 'none' }}>
        <DotsHorizontal />
      </SettingsActionWrapper>
      <When truthy={readSupportAdded(notification)}>
        {!notification.seen && <GradientDotWrapper colorScheme={colorScheme} />}
      </When>
    </ItemWrapper>
  );
}

function ActionWrapper({
  actionStatus,
  templateIdentifier,
  ctaAction,
  handleActionButtonClick,
}: {
  templateIdentifier: string;
  actionStatus: MessageActionStatusEnum;
  ctaAction: IMessageAction;
  handleActionButtonClick: (actionButtonType: ButtonTypeEnum) => void;
}) {
  const { actionsResultBlock } = useNotificationCenter();

  return (
    <>
      {actionsResultBlock && actionStatus === MessageActionStatusEnum.DONE ? (
        actionsResultBlock(templateIdentifier, ctaAction)
      ) : (
        <ActionContainerOrNone handleActionButtonClick={handleActionButtonClick} action={ctaAction} />
      )}
    </>
  );
}

export const readSupportAdded = (notification: IMessage) => typeof notification?.read !== 'undefined';

function ActionContainerOrNone({
  action,
  handleActionButtonClick,
}: {
  action: IMessageAction;
  handleActionButtonClick: (actionButtonType: ButtonTypeEnum) => void;
}) {
  return <>{action ? <ActionContainer onActionClick={handleActionButtonClick} action={action} /> : null}</>;
}

function GradientDotWrapper({ colorScheme }: { colorScheme: ColorScheme }) {
  const { bellColors } = useDefaultBellColors({
    colorScheme: colorScheme,
    bellColors: {
      unseenBadgeBackgroundColor: 'transparent',
    },
  });

  return <StyledGradientDot colors={bellColors} />;
}

const NotificationItemContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: normal;
  width: 100%;
`;

const TextContent = styled.div`
  line-height: 16px;
`;

const SettingsActionWrapper = styled.div`
  color: ${({ theme }) => theme.colors.secondaryFontColor};
`;

const unreadNotificationStyles = css<{ novuTheme: INovuTheme }>`
  background: ${({ novuTheme }) => novuTheme?.notificationItem?.unread?.background};
  box-shadow: ${({ novuTheme }) => novuTheme?.notificationItem?.unread?.boxShadow};
  color: ${({ novuTheme }) => novuTheme?.notificationItem?.unread?.fontColor};
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
    background: ${({ novuTheme }) => novuTheme?.notificationItem?.unread?.notificationItemBeforeBrandColor};
  }
`;
const readNotificationStyles = css<{ novuTheme: INovuTheme }>`
  color: ${({ novuTheme }) => novuTheme?.notificationItem?.read?.fontColor};
  background: ${({ novuTheme }) => novuTheme?.notificationItem?.read?.background};
  font-weight: 400;
  font-size: 14px;
`;

const ItemWrapper = styled.div<{ unseen?: boolean; unread?: boolean; novuTheme: INovuTheme }>`
  padding: 15px;
  position: relative;
  display: flex;
  line-height: 20px;
  justify-content: space-between;
  align-items: center;
  border-radius: 7px;
  margin: 10px 15px;

  &:hover {
    cursor: pointer;
  }

  ${({ unread }) => {
    return unread ? unreadNotificationStyles : readNotificationStyles;
  }}
`;

const TimeMark = styled.div<{ novuTheme: INovuTheme; unread?: boolean }>`
  min-width: 55px;
  font-size: 12px;
  font-weight: 400;
  opacity: 0.5;
  line-height: 14.4px;
  color: ${({ unread, novuTheme }) =>
    unread
      ? novuTheme?.notificationItem?.unread?.timeMarkFontColor
      : novuTheme?.notificationItem?.read?.timeMarkFontColor};
`;

const StyledGradientDot = styled(GradientDot)`
  height: 10px;
  width: 10px;
`;
