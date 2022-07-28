import React from 'react';
import { Text, TextBlock } from './UserPreference';
import { useNovuThemeProvider } from '../../../../hooks/use-novu-theme-provider.hook';
import { Switch } from '@mantine/core';
import { getChannel } from './channels';
import styled from 'styled-components';

export function ChannelPreference({ type, active }) {
  const { label, description, Icon } = getChannel(type);
  const { theme } = useNovuThemeProvider();
  const baseTheme = theme?.notificationItem?.unseen;
  const primaryColor = baseTheme.fontColor;
  const secondaryColor = baseTheme.timeMarkFontColor;

  return (
    <ChannelItemWrapper>
      <LeftContentWrapper>
        <Icon style={{ color: active ? primaryColor : secondaryColor }} />
        <TextBlock>
          <Text size={'md'} color={active ? primaryColor : secondaryColor}>
            {label}
          </Text>
          <Text size={'sm'} color={secondaryColor}>
            {description}
          </Text>
        </TextBlock>
      </LeftContentWrapper>
      <Switch
        styles={{
          input: {
            backgroundColor: secondaryColor,
            width: '40px',
            height: '24px',
            border: 'transparent',
            '&::before': {
              border: 'transparent',
              width: '20px',
              height: '20px',
            },
            '&:checked': {
              background: baseTheme.notificationItemBeforeBrandColor,
            },
          },
        }}
        checked={active}
      />
    </ChannelItemWrapper>
  );
}

const ChannelItemWrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const LeftContentWrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: 15px;
`;
