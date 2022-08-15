import styled from 'styled-components';
import { ActionIcon, Badge } from '@mantine/core';
import { colors } from '../../../../../shared/config/colors';
import React, { useContext } from 'react';
import { useNovuThemeProvider } from '../../../../../hooks/use-novu-theme-provider.hook';
import { INotificationCenterContext, INotificationsContext } from '../../../../../index';
import { NotificationCenterContext } from '../../../../../store/notification-center.context';
import { useTranslations } from '../../../../../hooks/use-translations';
import { Cogs } from '../../../../../shared/icons';
import { ScreensEnum } from '../Layout';
import { UnseenBadge } from '../../UnseenBadge';
import { NotificationsContext } from '../../../../..//store/notifications.context';

export function Header({ unseenCount, setScreen }: { unseenCount: number; setScreen: (screen: ScreensEnum) => void }) {
  const { theme, common } = useNovuThemeProvider();
  const { tabs, showUserPreferences, markAllAsSeen } = useContext<INotificationCenterContext>(NotificationCenterContext);
  const { t } = useTranslations();

  return (
    <HeaderWrapper>
      <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', alignItems: 'center' }}>
        <Text fontColor={theme.header.fontColor}>{t('notifications')}</Text>
        {!tabs && <UnseenBadge unseenCount={unseenCount} />}
      </div>
      <MarkReadAction disabled={unseenCount === 0} onClick={markAllAsSeen}>
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

const Text = styled.div<{ fontColor: string }>`
  color: ${({ fontColor }) => fontColor};
  font-size: 20px;
  font-style: normal;
  font-weight: 700;
  line-height: 24px;
  text-align: center;
`;

const MarkReadAction = styled.div<{ disabled: boolean }>`
  font-size: 14px;
  font-style: normal;
  font-weight: 400;
  line-height: 17px;
  color: ${colors.B60};
  cursor: pointer;
  pointer-events: ${({ disabled }) => (disabled ? 'none' : 'auto')};
  opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};
`;
