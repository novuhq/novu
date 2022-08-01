import React from 'react';
import { useNovuThemeProvider } from '../../../../hooks/use-novu-theme-provider.hook';
import { Switch } from '@mantine/core';
import { getChannel } from './channels';
import styled from 'styled-components';
import { useApi } from '../../../../hooks';
import { switchStyles, Text, TextBlock } from './styles';
import { IUserPreferenceSettings } from '../../../../index';

interface IChannelPreferenceProps {
  type: string;
  active: boolean;
  templateId: string;
  index: number;
  setSettings: (IUserPreferenceSettings) => void;
}
export function ChannelPreference({ type, active, templateId, index, setSettings }: IChannelPreferenceProps) {
  const { label, description, Icon } = getChannel(type);
  const { theme } = useNovuThemeProvider();
  const { api } = useApi();
  const baseTheme = theme?.notificationItem?.unseen;
  const primaryColor = baseTheme.fontColor;
  const secondaryColor = baseTheme.timeMarkFontColor;

  const handleUpdateChannelPreference = async (checked) => {
    const result = await api.updateSubscriberPreference(templateId, type, checked);

    setSettings((prev) =>
      prev.map((workflow, i) => {
        return i === index
          ? {
              template: workflow.template,
              preference: {
                ...workflow.preference,
                channels: { ...workflow.preference.channels, [type]: result.channels[type] },
              },
            }
          : workflow;
      })
    );
  };

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
        styles={switchStyles(baseTheme)}
        checked={active}
        onChange={(e) => handleUpdateChannelPreference(e.target.checked)}
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
