import { Navbar, useMantineTheme } from '@mantine/core';
import { useFormContext } from 'react-hook-form';
import { ChannelTypeEnum } from '@notifire/shared';
import { colors, TemplateButton, Text } from '../../design-system';
import {
  BellGradient,
  MailGradient,
  MobileGradient,
  PlusGradient,
  SmsGradient,
  TapeGradient,
} from '../../design-system/icons';

export function TemplatesSideBar({
  activeChannels,
  activeTab,
  changeTab,
  toggleChannel,
  channelButtons,
  showTriggerSection = false,
  alertErrors,
}: {
  activeChannels: { [p: string]: boolean };
  activeTab: string;
  changeTab: (string) => void;
  toggleChannel: (channel: ChannelTypeEnum, active: boolean) => void;
  channelButtons: string[];
  showTriggerSection: boolean;
  alertErrors: boolean;
  errors: any;
}) {
  const {
    formState: { errors },
  } = useFormContext();
  const templateButtons = [
    {
      tabKey: ChannelTypeEnum.IN_APP,
      label: 'In-App Content',
      description: 'Send notifications to the in-app notification center',
      Icon: MobileGradient,
      action: true,
      testId: 'inAppSelector',
      channelType: ChannelTypeEnum.IN_APP,
      areThereErrors: alertErrors && errors['inAppMessages.0.template.content'],
    },
    {
      tabKey: ChannelTypeEnum.EMAIL,
      label: 'Email Template',
      description: 'Send using one of our email integrations',
      Icon: MailGradient,
      testId: 'emailSelector',
      channelType: ChannelTypeEnum.EMAIL,
      action: true,
    },
    {
      tabKey: ChannelTypeEnum.SMS,
      label: 'SMS',
      description: "Send an SMS directly to the user's phone",
      Icon: SmsGradient,
      testId: 'smsSelector',
      action: true,
      channelType: ChannelTypeEnum.SMS,
      areThereErrors: alertErrors && errors['smsMessages.0.template.content'],
    },
  ];

  const links = templateButtons.map(
    (link) =>
      channelButtons.includes(link.tabKey) && (
        <TemplateButton
          {...link}
          active={link.tabKey === activeTab}
          changeTab={changeTab}
          switchButton={(checked) => toggleChannel(link.tabKey, checked)}
          checked={activeChannels[link.tabKey]}
          key={link.tabKey}
        />
      )
  );

  const theme = useMantineTheme();
  const textColor = theme.colorScheme === 'dark' ? colors.B40 : colors.B70;

  return (
    <Navbar mb={20} padding={30} width={{ base: 450 }} sx={{ paddingTop: '0px', height: 'auto' }}>
      <Navbar.Section mr={20}>
        <TemplateButton
          tabKey="Settings"
          changeTab={changeTab}
          Icon={BellGradient}
          testId="settingsButton"
          active={activeTab === 'Settings'}
          description="Configure cross-channel notification settings"
          label="Notification Settings"
          areThereErrors={alertErrors && errors.name}
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
            testId="add-channel"
            Icon={PlusGradient}
            active={activeTab === 'Add'}
            description="Add a new channel to this template"
            label="Add Channel"
          />
        </div>
      </Navbar.Section>
      {showTriggerSection && (
        <Navbar.Section mr={20}>
          <Text mt={10} mb={20} color={textColor}>
            Implementation Code
          </Text>
          <div>
            <TemplateButton
              tabKey="TriggerSnippet"
              changeTab={changeTab}
              Icon={TapeGradient}
              testId="triggerCodeSelector"
              active={activeTab === 'TriggerSnippet'}
              description="Get your notification trigger code snippet"
              label="Trigger Snippet"
            />
          </div>
        </Navbar.Section>
      )}
    </Navbar>
  );
}
