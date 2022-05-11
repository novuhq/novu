import { useMantineTheme } from '@mantine/core';
import { useFormContext } from 'react-hook-form';
import { ChannelTypeEnum } from '@novu/shared';
import styled from '@emotion/styled';
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
  setIsDirty,
  channelButtons,
  showTriggerSection = false,
  readonly = false,
  showErrors,
}: {
  activeChannels: { [p: string]: boolean };
  activeTab: string;
  changeTab: (string) => void;
  setIsDirty: (isDirty: boolean) => void;
  toggleChannel: (channel: ChannelTypeEnum, active: boolean) => void;
  channelButtons: string[];
  showTriggerSection: boolean;
  readonly: boolean;
  showErrors: boolean;
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
      errors: showErrors && getChannelErrors('inApp', errors),
    },
    {
      tabKey: ChannelTypeEnum.EMAIL,
      label: 'Email Template',
      description: 'Send using one of our email integrations',
      Icon: MailGradient,
      testId: 'emailSelector',
      channelType: ChannelTypeEnum.EMAIL,
      action: true,
      errors: showErrors && getChannelErrors('email', errors),
    },
    {
      tabKey: ChannelTypeEnum.SMS,
      label: 'SMS',
      description: "Send an SMS directly to the user's phone",
      Icon: SmsGradient,
      testId: 'smsSelector',
      action: true,
      channelType: ChannelTypeEnum.SMS,
      errors: showErrors && getChannelErrors('sms', errors),
    },
  ];

  const links = templateButtons.map(
    (link) =>
      channelButtons.includes(link.tabKey) && (
        <TemplateButton
          {...link}
          active={link.tabKey === activeTab}
          changeTab={changeTab}
          switchButton={(checked) => {
            setIsDirty(true);
            toggleChannel(link.tabKey, checked);
          }}
          checked={activeChannels[link.tabKey]}
          readonly={readonly}
          key={link.tabKey}
        />
      )
  );

  const theme = useMantineTheme();
  const textColor = theme.colorScheme === 'dark' ? colors.B40 : colors.B70;

  return (
    <StyledNav>
      <NavSection>
        <TemplateButton
          tabKey="Settings"
          changeTab={changeTab}
          Icon={BellGradient}
          testId="settingsButton"
          active={activeTab === 'Settings'}
          description="Configure cross-channel notification settings"
          label="Notification Settings"
          errors={showErrors && (errors.name || errors.notificationGroup)}
        />
        <TemplateButton
          tabKey="Workflow"
          changeTab={changeTab}
          Icon={BellGradient}
          testId="workflowButton"
          active={activeTab === 'Workflow'}
          description="Configure cross-channel notification settings"
          label="Workflow Editor"
          errors={showErrors && (errors.name || errors.notificationGroup)}
        />
      </NavSection>
      <NavSection>
        <Text mt={10} mb={20} color={textColor}>
          Channels
        </Text>
        <div>
          {links}
          {!readonly && (
            <TemplateButton
              tabKey="Add"
              changeTab={changeTab}
              testId="add-channel"
              Icon={PlusGradient}
              active={activeTab === 'Add'}
              description="Add a new channel to this template"
              label="Add Channel"
            />
          )}
        </div>
      </NavSection>
      {showTriggerSection && (
        <NavSection>
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
        </NavSection>
      )}
    </StyledNav>
  );
}

function getChannelErrors(channel: 'sms' | 'email' | 'inApp', errors: { [p: string]: string }) {
  const keys = Object.keys(errors);
  const channelErrors = keys.filter((key) => {
    return key.includes(`${channel}Messages`);
  });

  return channelErrors.map((key) => errors[key]).toString();
}

const StyledNav = styled.div`
  margin-bottom: 30px;
`;

const NavSection = styled.div``;
