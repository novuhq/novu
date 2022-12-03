import React, { useState } from 'react';
import { Accordion, Divider, ScrollArea } from '@mantine/core';
import styled from 'styled-components';
import { useNovuTheme, useSubscriberPreference } from '../../../../hooks';
import { accordionStyles, Text, TextBlock } from './styles';
import { ChannelPreference } from './ChannelPreference';
import { getChannel } from './channels';
import image from '../../../../images/no-settings.png';

export function SubscriberPreference() {
  const { theme, common } = useNovuTheme();
  const { preferences: data, updatePreference, loading } = useSubscriberPreference();
  const baseTheme = theme?.userPreferences;
  const [loadingUpdate, setLoadingUpdate] = useState<boolean>(false);
  const preferences = data
    ?.filter((item) => !item.template.critical)
    ?.filter((pref) => Object.keys(pref.preference.channels).length > 0);

  return (
    <>
      {!loading && preferences?.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            minHeight: 400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img src={image as any} alt="logo" style={{ maxWidth: 300 }} />
        </div>
      ) : (
        <ScrollArea style={{ height: 400 }}>
          <div style={{ padding: '15px' }}>
            <Accordion chevronPosition="right" styles={accordionStyles(baseTheme, common.fontFamily)}>
              {preferences?.map((item, index) => {
                const channelsKeys = Object.keys(item?.preference?.channels);
                const channelsPreference = item?.preference?.channels;

                const handleUpdateChannelPreference = async (type: string, checked: boolean) => {
                  setLoadingUpdate(true);
                  await updatePreference(item, type, checked, index);
                  setLoadingUpdate(false);
                };

                return (
                  <Accordion.Item value={item.template._id} key={index} data-test-id="workflow-list-item">
                    <Accordion.Control>
                      <WorkflowHeader
                        theme={baseTheme}
                        label={item.template?.name}
                        channels={getEnabledChannels(channelsPreference)}
                      />
                    </Accordion.Control>
                    <Accordion.Panel>
                      <ChannelsWrapper>
                        <Divider style={{ borderTopColor: baseTheme?.accordion?.dividerColor }} />
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
                    </Accordion.Panel>
                  </Accordion.Item>
                );
              })}
            </Accordion>
          </div>
        </ScrollArea>
      )}
    </>
  );
}

function WorkflowHeader({ label, channels, theme }) {
  return (
    <TextBlock>
      <Text size={'lg'} color={theme?.accordion?.fontColor}>
        {label}
      </Text>
      <Text data-test-id="workflow-active-channels" size={'sm'} color={theme?.accordion?.secondaryFontColor}>
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
