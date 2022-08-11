import React, { useState } from 'react';
import { Accordion } from '@mantine/core';
import styled from 'styled-components';
import { useNovuThemeProvider, useSubscriberPreference } from '../../../../hooks';
import { accordionStyles, Text, TextBlock } from './styles';
import { ChannelPreference } from './ChannelPreference';
import { getChannel } from './channels';

export function SubscriberPreference() {
  const { theme, common } = useNovuThemeProvider();
  const { preferences, updatePreference } = useSubscriberPreference();
  const baseTheme = theme?.preferenceItem;
  const [loadingUpdate, setLoadingUpdate] = useState<boolean>(false);

  return (
    <div style={{ padding: '15px' }}>
      <Accordion iconPosition="right" styles={accordionStyles(baseTheme, common.fontFamily)}>
        {preferences
          ?.filter((item) => !item.template.critical)
          .map((item, index) => {
            const channelsKeys = Object.keys(item?.preference?.channels);
            const channelsPreference = item?.preference?.channels;

            const handleUpdateChannelPreference = async (type: string, checked: boolean) => {
              setLoadingUpdate(true);
              await updatePreference(item, type, checked, index);
              setLoadingUpdate(false);
            };

            return (
              <Accordion.Item
                key={index}
                data-test-id="workflow-list-item"
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
      <Text
        data-test-id="workflow-active-channels"
        size={'sm'}
        color={theme?.notificationItem?.unseen.timeMarkFontColor}
      >
        {channels}
      </Text>
    </TextBlock>
  );
}

function getEnabledChannels(channels) {
  const keys = Object.keys(channels);
  const list = keys.filter((key) => channels[key]).map((channel) => getChannel(channel).label);

  return list.join(', ');
}

const ChannelsWrapper = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0;
  gap: 20px;
`;
