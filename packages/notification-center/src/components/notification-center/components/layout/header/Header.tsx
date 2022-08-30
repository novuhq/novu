import React, { useContext } from 'react';
import { ActionIcon, Badge } from '@mantine/core';
import styled from 'styled-components';
import { colors } from '../../../../../shared/config/colors';
import { useNovuTheme, useScreens, useTranslations } from '../../../../../hooks';
import { INotificationCenterContext } from '../../../../../index';
import { NotificationCenterContext, ScreensEnum } from '../../../../../store';
import { Cogs } from '../../../../../shared/icons';

export function Header({ unseenCount }: { unseenCount: number }) {
  const { theme, common } = useNovuTheme();
  const { setScreen } = useScreens();
  const { tabs, showUserPreferences } = useContext<INotificationCenterContext>(NotificationCenterContext);
  const { t } = useTranslations();

  return (
    <HeaderWrapper>
      <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', alignItems: 'center' }}>
        <Text fontColor={theme.header.fontColor} data-test-id="notifications-header-title">
          {t('notifications')}
        </Text>
        {!tabs && unseenCount && unseenCount > 0 ? (
          <Badge
            data-test-id="unseen-count-label"
            sx={{
              padding: 0,
              width: 20,
              height: 20,
              pointerEvents: 'none',
              border: 'none',
              background: theme.header?.badgeColor,
              fontFamily: common.fontFamily,
              lineHeight: '14px',
              color: theme.header?.badgeTextColor,
              fontWeight: 'bold',
              fontSize: '12px',
            }}
            radius={100}
          >
            {unseenCount}
          </Badge>
        ) : null}
      </div>
      <div style={{ display: showUserPreferences ? 'inline-block' : 'none' }}>
        <ActionIcon
          data-test-id="user-preference-cog"
          variant="transparent"
          onClick={() => setScreen(ScreensEnum.SETTINGS)}
        >
          <Cogs style={{ color: theme?.userPreferences?.settingsButtonColor }} />
        </ActionIcon>
      </div>
      <MarkReadAction style={{ display: 'none' }}>{t('markAllAsRead')}</MarkReadAction>
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
const MarkReadAction = styled.div`
  font-size: 14px;
  font-style: normal;
  font-weight: 400;
  line-height: 17px;
  color: ${colors.B60};
`;
