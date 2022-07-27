import React from 'react';
import { ArrowLeft } from '../../../../shared/icons';
import styled from 'styled-components';
import { useNovuThemeProvider } from '../../../../hooks/use-novu-theme-provider.hook';
import { Accordion, ActionIcon } from '@mantine/core';
import { ChannelPreference } from './ChannelPreference';
import { getChannel } from './channels';

const data = [
  {
    name: 'Workflow 1',
    channels: [
      { type: 'push', active: true },
      { type: 'email', active: true },
      { type: 'sms', active: false },
    ],
  },
  {
    name: 'Workflow 2',
    channels: [
      { type: 'push', active: true },
      { type: 'sms', active: false },
    ],
  },
  {
    name: 'Workflow 3',
    channels: [
      { type: 'push', active: false },
      { type: 'sms', active: false },
      { type: 'email', active: true },
    ],
  },
];

export function UserPreference({ setShowSettings }: { setShowSettings: (boolean) => void }) {
  const { theme, common } = useNovuThemeProvider();
  const baseTheme = theme?.notificationItem?.unseen;

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', alignItems: 'center' }}>
        <ActionIcon variant="transparent" onClick={() => setShowSettings(false)}>
          <ArrowLeft style={{ marginLeft: '15px', color: theme.header.fontColor }} />
        </ActionIcon>
        <Title fontColor={theme.header.fontColor}>Settings</Title>
      </div>
      <div style={{ padding: '15px' }}>
        <Accordion
          iconPosition="right"
          styles={{
            item: {
              borderBottom: 'none',
              boxShadow: baseTheme.boxShadow,
              backgroundColor: baseTheme.background,
              marginBottom: '15px',
              borderRadius: '7px',
            },
            content: {
              color: baseTheme.fontColor,
              fontFamily: common.fontFamily,
            },
            control: {
              fontFamily: common.fontFamily,
              '&:hover': {
                backgroundColor: baseTheme.background,
                borderRadius: '7px',
              },
            },
            icon: {
              color: baseTheme.timeMarkFontColor,
            },
          }}
        >
          {data.map((item) => (
            <Accordion.Item
              key={item.name}
              label={
                <WorkflowHeader
                  theme={theme}
                  label={item.name}
                  channels={item.channels
                    .filter((channel) => channel.active)
                    .map((channel) => getChannel(channel.type).label)
                    .join(', ')}
                />
              }
            >
              <ChannelsWrapper>
                {item.channels.map((channel) => (
                  <ChannelPreference key={channel.type} type={channel.type} active={channel.active} />
                ))}
              </ChannelsWrapper>
            </Accordion.Item>
          ))}
        </Accordion>
      </div>
    </>
  );
}

function WorkflowHeader({ label, channels, theme }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '0px', gap: '5px' }}>
      <Text size={'lg'} color={theme.header.fontColor}>
        {label}
      </Text>
      <Text size={'sm'} color={theme?.notificationItem?.unseen.timeMarkFontColor}>
        {channels}
      </Text>
    </div>
  );
}

export const Text = styled.div<{ color: string; size: 'sm' | 'md' | 'lg' }>`
  color: ${({ color }) => color};
  font-size: ${({ size }) => (size === 'sm' ? '12px' : '14px')};
  font-style: normal;
  font-weight: ${({ size }) => (size === 'lg' ? '700' : '400')};
  line-height: ${({ size }) => (size === 'sm' ? '14.4px' : '16.8px')};
  text-align: left;
`;

const Title = styled.div<{ fontColor: string }>`
  color: ${({ fontColor }) => fontColor};
  font-size: 20px;
  font-style: normal;
  font-weight: 700;
  line-height: 24px;
  text-align: left;
`;

const ChannelsWrapper = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0px;
  gap: 20px;
`;
