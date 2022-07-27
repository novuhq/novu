import styled from 'styled-components';
import { ActionIcon, Badge } from '@mantine/core';
import { colors } from '../../../../../shared/config/colors';
import React, { useContext } from 'react';
import { useNovuThemeProvider } from '../../../../../hooks/use-novu-theme-provider.hook';
import { INotificationCenterContext } from '../../../../../index';
import { NotificationCenterContext } from '../../../../../store/notification-center.context';
import { I18NContext } from '../../../../../store/i18n.context';
import { Cogs } from '../../../../../shared/icons';

export function Header({ unseenCount, setShowSettings }: { unseenCount: number; setShowSettings: (boolean) => void }) {
  const { theme, common } = useNovuThemeProvider();
  const { tabs } = useContext<INotificationCenterContext>(NotificationCenterContext);
  const { translations } = useContext(I18NContext);

  return (
    <HeaderWrapper>
      <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', alignItems: 'center' }}>
        <Text fontColor={theme.header.fontColor}>Notifications </Text>
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
      <div>
        <ActionIcon variant="transparent" onClick={() => setShowSettings(true)}>
          <Cogs style={{ color: theme?.notificationItem?.seen?.timeMarkFontColor }} />
        </ActionIcon>
      </div>
      <MarkReadAction style={{ display: 'none' }}>{translations.markAllAsRead}</MarkReadAction>
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
