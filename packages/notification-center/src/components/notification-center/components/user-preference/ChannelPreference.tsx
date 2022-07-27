import React from 'react';
import { Text } from './UserPreference';
import { useNovuThemeProvider } from '../../../../hooks/use-novu-theme-provider.hook';
import { Switch } from '@mantine/core';
import { getChannel } from './channels';

export function ChannelPreference({ type, active }) {
  const channel = getChannel(type);
  const { theme } = useNovuThemeProvider();
  const baseTheme = theme?.notificationItem?.unseen;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0px',
        gap: '20px',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '0px',
          gap: '15px',
        }}
      >
        {channel.icon}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            padding: '0px',
            gap: '5px',
          }}
        >
          <Text size={'md'} color={baseTheme.fontColor}>
            {channel.label}
          </Text>
          <Text size={'sm'} color={baseTheme.timeMarkFontColor}>
            {channel.description}
          </Text>
        </div>
      </div>
      <Switch
        styles={{
          input: {
            backgroundColor: baseTheme.timeMarkFontColor,
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
    </div>
  );
}
