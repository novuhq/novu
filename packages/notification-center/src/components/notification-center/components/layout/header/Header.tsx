import React, { useContext, useEffect, useState } from 'react';
import { ActionIcon } from '@mantine/core';
import styled from 'styled-components';
import {
  useNotificationCenter,
  useNotifications,
  useNovuTheme,
  useScreens,
  useTranslations,
  useUnseenCount,
} from '../../../../../hooks';
import { INotificationCenterContext } from '../../../../../shared/interfaces';
import { NotificationCenterContext } from '../../../../../store/notification-center.context';
import { ScreensEnum } from '../../../../../shared/enums/screens.enum';
import { Cogs } from '../../../../../shared/icons';
import { UnseenBadge } from '../../UnseenBadge';
import { useFeed } from '../../../../../hooks/use-feed.hook';

export function Header() {
  const [allRead, setAllRead] = useState<boolean>(true);
  const { onUnseenCountChanged } = useNotificationCenter();
  const { unseenCount } = useUnseenCount();
  const { theme } = useNovuTheme();
  const { setScreen } = useScreens();
  const { tabs, showUserPreferences } = useContext<INotificationCenterContext>(NotificationCenterContext);
  const { activeTabStoreId } = useFeed();
  const { markAllAsRead, notifications } = useNotifications({ storeId: activeTabStoreId });
  const { t } = useTranslations();

  useEffect(() => {
    if (onUnseenCountChanged) {
      onUnseenCountChanged(unseenCount);
    }
  }, [unseenCount, (window as any).parentIFrame]);

  useEffect(() => {
    if (notifications) {
      const read = notifications.some((msg) => msg.read === false);
      setAllRead(read);
    }
  }, [notifications]);

  return (
    <HeaderWrapper>
      <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', alignItems: 'center' }}>
        <Text fontColor={theme.header.fontColor} data-test-id="notifications-header-title">
          {t('notifications')}
        </Text>
        {!tabs && <UnseenBadge unseenCount={unseenCount} />}
      </div>
      <ActionItems>
        <MarkReadAction disabled={!allRead} fontColor={theme.header?.markAllAsReadButtonColor} onClick={markAllAsRead}>
          {t('markAllAsRead')}
        </MarkReadAction>
        <div style={{ display: showUserPreferences ? 'inline-block' : 'none' }}>
          <ActionIcon
            data-test-id="user-preference-cog"
            variant="transparent"
            onClick={() => setScreen(ScreensEnum.SETTINGS)}
          >
            <Cogs style={{ color: theme?.userPreferences?.settingsButtonColor }} />
          </ActionIcon>
        </div>
      </ActionItems>
    </HeaderWrapper>
  );
}

const HeaderWrapper = styled.div`
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

const Text = styled.div<{ fontColor: string }>`
  color: ${({ fontColor }) => fontColor};
  font-size: 20px;
  font-style: normal;
  font-weight: 700;
  line-height: 24px;
  text-align: center;
`;

const MarkReadAction = styled.div<{ disabled: boolean; fontColor: string }>`
  margin-right: 10px;
  font-size: 14px;
  font-style: normal;
  font-weight: 400;
  line-height: 17px;
  color: ${({ fontColor }) => fontColor};
  cursor: pointer;
  pointer-events: ${({ disabled }) => (disabled ? 'none' : 'auto')};
  opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};
`;
