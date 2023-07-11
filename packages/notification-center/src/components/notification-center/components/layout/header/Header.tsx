import React, { useContext, useEffect, useState } from 'react';
import { css, cx } from '@emotion/css';
import styled from '@emotion/styled';
import { ActionIcon } from '@mantine/core';

import { useNotifications, useNovuTheme, useTranslations } from '../../../../../hooks';
import { Cogs } from '../../../../../shared/icons';
import { INotificationCenterContext } from '../../../../../shared/interfaces';
import { NotificationCenterContext } from '../../../../../store/notification-center.context';
import { INovuTheme } from '../../../../../store/novu-theme.context';
import { useStyles } from '../../../../../store/styles';
import { UnseenBadge } from '../../UnseenBadge';

export function Header({ onCogClick }: { onCogClick?: () => void }) {
  const [allRead, setAllRead] = useState<boolean>(true);
  const { markAllNotificationsAsRead, notifications, unseenCount } = useNotifications();
  const { theme } = useNovuTheme();
  const { tabs, showUserPreferences } = useContext<INotificationCenterContext>(NotificationCenterContext);
  const { t } = useTranslations();
  const [headerStyles, headerTitleStyles, headerMarkAsReadStyles, headerCogStyles] = useStyles([
    'header.root',
    'header.title',
    'header.markAsRead',
    'header.cog',
  ]);

  useEffect(() => {
    if (notifications) {
      const read = notifications.some((msg) => msg.read === false);
      setAllRead(read);
    }
  }, [notifications]);

  return (
    <div className={cx('nc-header', headerClassName, css(headerStyles))}>
      <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', alignItems: 'center' }}>
        <div
          className={cx('nc-header-title', titleClassName(theme.header.fontColor), css(headerTitleStyles))}
          data-test-id="notifications-header-title"
        >
          {t('notifications')}
        </div>
        {!tabs && <UnseenBadge unseenCount={unseenCount} />}
      </div>
      <ActionItems>
        <div
          className={cx(
            'nc-header-mark-as-read',
            markAsReadClassName(!allRead, theme.header?.markAllAsReadButtonColor),
            css(headerMarkAsReadStyles)
          )}
          onClick={markAllNotificationsAsRead}
          role="button"
          tabIndex={0}
          data-test-id="notifications-header-mark-all-as-read"
        >
          {t('markAllAsRead')}
        </div>
        <div style={{ display: showUserPreferences ? 'inline-block' : 'none' }}>
          <ActionIcon data-test-id="user-preference-cog" variant="transparent" onClick={onCogClick}>
            <Cogs className={cx('nc-header-cog', cogClassName(theme), css(headerCogStyles))} />
          </ActionIcon>
        </div>
      </ActionItems>
    </div>
  );
}

const headerClassName = css`
  padding: 5px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 55px;
`;

const ActionItems = styled.div`
  display: flex;
  align-items: center;
`;

const cogClassName = (theme: INovuTheme) => css`
  color: ${theme?.userPreferences?.settingsButtonColor};
`;

const titleClassName = (fontColor: string) => css`
  color: ${fontColor};
  font-size: 20px;
  font-style: normal;
  font-weight: 700;
  line-height: 24px;
  text-align: center;
`;

const markAsReadClassName = (disabled: boolean, fontColor: string) => css`
  margin-right: 10px;
  font-size: 14px;
  font-style: normal;
  font-weight: 400;
  line-height: 17px;
  color: ${fontColor};
  cursor: pointer;
  pointer-events: ${disabled ? 'none' : 'auto'};
  opacity: ${disabled ? 0.5 : 1};
`;
