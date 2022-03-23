import React from 'react';
import { Card, Grid, Group } from '@mantine/core';
import { ChannelTypeEnum } from '@notifire/shared';
import styled from '@emotion/styled';
import { colors, shadows, Text } from '../../../design-system';
import { MailGradient, MobileGradient, SmsGradient } from '../../../design-system/icons';

const channels = [
  {
    label: 'Email',
    tabKey: ChannelTypeEnum.EMAIL,
    icon: <MailGradient width="40px" height="40px" />,
    channelType: ChannelTypeEnum.EMAIL,
    testId: 'emailAddChannel',
  },
  {
    label: 'SMS',
    tabKey: ChannelTypeEnum.SMS,
    icon: <SmsGradient width="40px" height="40px" />,
    channelType: ChannelTypeEnum.SMS,
    testId: 'smsAddChannel',
  },
  {
    label: 'In-App',
    tabKey: ChannelTypeEnum.IN_APP,
    icon: <MobileGradient width="40px" height="40px" />,
    channelType: ChannelTypeEnum.IN_APP,
    testId: 'inAppAddChannel',
  },
];

export const AddChannelsPage = ({
  handleAddChannel,
  channelButtons,
}: {
  channelButtons: string[];
  handleAddChannel: (ChannelTypeEnum) => void;
}) => {
  return (
    <Grid gutter={30}>
      {channels.map((channel) => (
        <Grid.Col key={channel.label} span={4}>
          <Card
            onClick={() => handleAddChannel(channel.tabKey)}
            data-test-id={channel.testId}
            sx={(theme) => {
              const selected = channelButtons.includes(channel.tabKey);

              return {
                backgroundColor: theme.colorScheme === 'dark' ? colors.B17 : colors.B98,
                borderRadius: '7px',
                height: '200px',
                opacity: selected ? '0.5' : '1',
                [`&:hover`]: {
                  cursor: 'pointer',
                  ...(!selected
                    ? {
                        backgroundColor: theme.colorScheme === 'dark' ? colors.B20 : colors.BGLight,
                        boxShadow: theme.colorScheme === 'dark' ? shadows.dark : shadows.light,
                      }
                    : {}),
                },
              };
            }}>
            <StyledCardContent>
              <div>{channel.icon}</div>
              <Text weight="bold" size="lg">
                {channel.label}
              </Text>
            </StyledCardContent>
          </Card>
        </Grid.Col>
      ))}
    </Grid>
  );
};

const StyledCardContent = ({ children }: { children: React.ReactNode }) => {
  return (
    <Group
      align="center"
      spacing={7}
      direction="column"
      styles={{
        root: {
          position: 'absolute',
          top: '50%',
          left: '50%',
          marginRight: '-50%',
          transform: 'translate(-50%, -50%)',
        },
      }}>
      {children}
    </Group>
  );
};
