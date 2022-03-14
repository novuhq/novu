import { Navbar, useMantineTheme } from '@mantine/core';
import { ChannelTypeEnum } from '@notifire/shared';
import { colors, TemplateButton, Text } from '../../design-system';
import { BellGradient, MailGradient, MobileGradient, PlusGradient, SmsGradient } from '../../design-system/icons';

const templateButtons = [
  {
    tabKey: 'IN_APP',
    label: 'In-App Content',
    description: 'This subtitle will describe things',
    Icon: MobileGradient,
    action: true,
    channelType: ChannelTypeEnum.IN_APP,
  },
  {
    tabKey: 'EMAIL',
    label: 'Email Template',
    description: 'This subtitle will describe things',
    Icon: MailGradient,
    channelType: ChannelTypeEnum.EMAIL,
    action: true,
  },
  {
    tabKey: 'SMS',
    label: 'SMS',
    description: 'This subtitle will describe things',
    Icon: SmsGradient,
    action: true,
    channelType: ChannelTypeEnum.SMS,
  },
];

export function TemplatesSideBar({
  activeChannels,
  activeTab,
  changeTab,
  toggleChannel,
  channelButtons,
}: {
  activeChannels: { [p: string]: boolean };
  activeTab: string;
  changeTab: (string) => void;
  toggleChannel: (channel: ChannelTypeEnum, active: boolean) => void;
  channelButtons: string[];
}) {
  const links = templateButtons.map(
    (link) =>
      channelButtons.includes(link.tabKey) && (
        <TemplateButton
          {...link}
          active={link.tabKey === activeTab}
          changeTab={changeTab}
          switchButton={(checked) => toggleChannel(link.channelType, checked)}
          checked={activeChannels[link.channelType]}
          key={link.tabKey}
        />
      )
  );

  const theme = useMantineTheme();
  const textColor = theme.colorScheme === 'dark' ? colors.B40 : colors.B70;

  return (
    <Navbar mb={20} padding={30} width={{ base: 450 }} sx={{ paddingTop: '0px' }}>
      <Navbar.Section mr={20}>
        <TemplateButton
          tabKey="Settings"
          changeTab={changeTab}
          Icon={BellGradient}
          active={activeTab === 'Settings'}
          description="This subtitle will describe things"
          label="Notification Settings"
        />
      </Navbar.Section>
      <Navbar.Section mr={20}>
        <Text mt={10} mb={20} color={textColor}>
          Channels
        </Text>
        <div>
          {links}
          <TemplateButton
            tabKey="Add"
            changeTab={changeTab}
            Icon={PlusGradient}
            active={activeTab === 'Add'}
            description="This subtitle will describe things"
            label="Add Channel"
          />
        </div>
      </Navbar.Section>
    </Navbar>
  );
}
