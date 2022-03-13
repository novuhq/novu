import React from 'react';
import { Card, Grid, Group } from '@mantine/core';
import { ChannelTypeEnum } from '@notifire/shared';
import { colors, shadows, Text } from '../../../design-system';
import { MailGradient, MobileGradient, SmsGradient } from '../../../design-system/icons';

const channels = [
  {
    label: 'Email',
    tabKey: 'EMAIL',
    icon: <MailGradient width="40px" height="40px" />,
    channelType: ChannelTypeEnum.EMAIL,
  },
  { label: 'SMS', tabKey: 'SMS', icon: <SmsGradient width="40px" height="40px" />, channelType: ChannelTypeEnum.SMS },
  {
    label: 'In-App',
    tabKey: 'IN_APP',
    icon: <MobileGradient width="40px" height="40px" />,
    channelType: ChannelTypeEnum.IN_APP,
  },
];

export const AddChannelsPage = ({ handleAddChannel }: { handleAddChannel: (string) => void }) => {
  return (
    <Grid gutter={30}>
      {channels.map((channel) => (
        <Grid.Col key={channel.label} span={4}>
          <Card onClick={() => handleAddChannel(channel.tabKey)} sx={styledCard}>
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

const styledCard = (theme) => ({
  backgroundColor: theme.colorScheme === 'dark' ? colors.B17 : colors.B98,
  borderRadius: '7px',
  height: '200px',
  '&:hover': {
    backgroundColor: theme.colorScheme === 'dark' ? colors.B20 : colors.BGLight,
    boxShadow: theme.colorScheme === 'dark' ? shadows.dark : shadows.light,
  },
});

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
