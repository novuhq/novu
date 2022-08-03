import { ActionIcon } from '@mantine/core';
import { ArrowLeft } from '../../../../../shared/icons';
import React from 'react';
import styled from 'styled-components';
import { useNovuThemeProvider } from '../../../../../hooks/use-novu-theme-provider.hook';
import { ScreensEnum } from '../Layout';

export function UserPreferenceHeader({ setScreen }: { setScreen: (screen: ScreensEnum) => void }) {
  const { theme } = useNovuThemeProvider();

  return (
    <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', alignItems: 'center' }}>
      <ActionIcon variant="transparent" onClick={() => setScreen(ScreensEnum.NOTIFICATIONS)}>
        <ArrowLeft style={{ marginLeft: '15px', color: theme.header.fontColor }} />
      </ActionIcon>
      <Title fontColor={theme.header.fontColor}>Settings</Title>
    </div>
  );
}

const Title = styled.div<{ fontColor: string }>`
  color: ${({ fontColor }) => fontColor};
  font-size: 20px;
  font-style: normal;
  font-weight: 700;
  line-height: 24px;
  text-align: left;
`;
