import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useNovuThemeProvider } from '../../../../hooks/use-novu-theme-provider.hook';
import { Accordion } from '@mantine/core';
import { ChannelPreference } from './ChannelPreference';
import { getChannel } from './channels';
import { useApi } from '../../../../hooks';
import { IUserPreferenceSettings } from '../../../../index';
import { accordionStyles, Text, TextBlock } from './styles';
import { IPreferenceChannels } from '@novu/shared';

export function UserPreference() {
  const { theme, common } = useNovuThemeProvider();
  const { api } = useApi();
  const [settings, setSettings] = useState<IUserPreferenceSettings[]>([]);
  const [loadingUpdate, setLoadingUpdate] = useState<boolean>(false);
  const baseTheme = theme?.notificationItem?.unseen;

  useEffect(() => {
    if (!api?.isAuthenticated) return;

    (async () => {
      const result = await api.getUserPreference();

      setSettings(result);
    })();
  }, [api?.isAuthenticated]);

  return (
    <div style={{ padding: '15px' }}>
      <Accordion iconPosition="right" styles={accordionStyles(baseTheme, common.fontFamily)}>
        {settings?.map((item, index) => {
          const channelsKeys = Object.keys(item?.preference?.channels);
          const channelsPreference = item?.preference?.channels;

          const handleUpdateChannelPreference = async (type: string, checked: boolean) => {
            setLoadingUpdate(true);
            const result = await api.updateSubscriberPreference(item.template._id, type, checked);

            setSettings((prev) => {
              return prev.map((workflow, i) => {
                if (i === index) {
                  return {
                    template: workflow.template,
                    preference: {
                      ...result,
                    },
                  };
                }

                return workflow;
              });
            });

            setLoadingUpdate(false);
          };

          return (
            <Accordion.Item
              key={index}
              label={
                <WorkflowHeader
                  theme={theme}
                  label={item.template?.name}
                  channels={getEnabledChannels(channelsPreference)}
                />
              }
            >
              <ChannelsWrapper>
                {channelsKeys.map((key) => (
                  <ChannelPreference
                    key={key}
                    type={key}
                    active={channelsPreference[key]}
                    disabled={loadingUpdate}
                    handleUpdateChannelPreference={handleUpdateChannelPreference}
                  />
                ))}
              </ChannelsWrapper>
            </Accordion.Item>
          );
        })}
      </Accordion>
    </div>
  );
}

function WorkflowHeader({ label, channels, theme }) {
  return (
    <TextBlock>
      <Text size={'lg'} color={theme.header.fontColor}>
        {label}
      </Text>
      <Text size={'sm'} color={theme?.notificationItem?.unseen.timeMarkFontColor}>
        {channels}
      </Text>
    </TextBlock>
  );
}

function getEnabledChannels(channels: IPreferenceChannels) {
  const keys = Object.keys(channels);
  const list = keys.filter((key) => channels[key]).map((channel) => getChannel(channel).label);

  return list.join(', ');
}

const ChannelsWrapper = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0px;
  gap: 20px;
`;
