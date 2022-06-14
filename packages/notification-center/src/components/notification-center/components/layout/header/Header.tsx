import styled from 'styled-components';
import { Badge } from '@mantine/core';
import { colors } from '../../../../../shared/config/colors';
import React from 'react';
import { useNovuThemeProvider } from '../../../../../hooks/use-novu-theme-provider.hook';

export function Header({ unseenCount }: { unseenCount: number }) {
  const { theme } = useNovuThemeProvider();

  return (
    <HeaderWrapper>
      <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', alignItems: 'center' }}>
        <Text>Notifications </Text>
        {unseenCount && unseenCount > 0 ? (
          <Badge
            data-test-id="unseen-count-label"
            sx={{
              padding: 0,
              width: 20,
              height: 20,
              pointerEvents: 'none',
              border: 'none',
              background: theme.header.mainColor,
              fontFamily: theme.fontFamily,
              lineHeight: '14px',
              color: colors.white,
              fontWeight: 'bold',
              fontSize: '12px',
            }}
            radius={100}
          >
            {unseenCount}
          </Badge>
        ) : null}
      </div>
      <MarkReadAction style={{ display: 'none' }}>Mark all as read</MarkReadAction>
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

const Text = styled.div`
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
