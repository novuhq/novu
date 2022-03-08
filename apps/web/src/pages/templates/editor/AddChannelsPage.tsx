import { Card, Center, Grid, Group, Paper } from '@mantine/core';
import {
  CompassGradient,
  GlobeGradient,
  MailGradient,
  MobileGradient,
  SmsGradient,
} from '../../../design-system/icons';
import { colors, shadows, Text } from '../../../design-system';

const channels = [
  { label: 'Email', icon: <MailGradient width="40px" height="40px" /> },
  { label: 'SMS', icon: <SmsGradient width="40px" height="40px" /> },
  { label: 'In-App', icon: <MobileGradient width="40px" height="40px" /> },
  { label: 'Direct', icon: <CompassGradient width="40px" height="40px" /> },
  { label: 'Web-Push', icon: <GlobeGradient width="40px" height="40px" /> },
];

export const AddChannelsPage = () => {
  return (
    <Grid gutter={30}>
      {channels.map((channel) => (
        <Grid.Col span={4}>
          <Card
            sx={(theme) => ({
              backgroundColor: theme.colorScheme === 'dark' ? colors.B17 : colors.B98,
              borderRadius: '7px',
              height: '200px',
              padding: 'calc(100% / 4)',
              '&:hover': {
                backgroundColor: theme.colorScheme === 'dark' ? colors.B20 : colors.BGLight,
                boxShadow: theme.colorScheme === 'dark' ? shadows.dark : shadows.light,
              },
            })}>
            <Group align="center" spacing={7} direction="column">
              <div>{channel.icon}</div>
              <Text weight="bold" size="lg">
                {channel.label}
              </Text>
            </Group>
          </Card>
        </Grid.Col>
      ))}
    </Grid>
  );
};
