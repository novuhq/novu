import React, { useState } from 'react';
import { Accordion, Divider, ScrollArea } from '@mantine/core';
import styled from '@emotion/styled';
import { css, cx } from '@emotion/css';

import { useNovuTheme, useSubscriberPreference } from '../../../../hooks';
import { accordionStyles, Text, TextBlock } from './styles';
import { ChannelPreference } from './ChannelPreference';
import { getChannel } from './channels';
import image from '../../../../images/no-settings.png';
import { useStyles } from '../../../../store/styles';
import { IThemeUserPreferences } from '../../../../store/novu-theme.context';

const rootClassName = css`
  padding: 15px;
`;

const preferencesTitleClassName = (theme) => css`
  color: ${theme?.accordion?.fontColor};
`;

const preferencesChannelsClassName = (theme) => css`
  color: ${theme?.accordion?.secondaryFontColor};
`;

const dividerClassName = (baseTheme: IThemeUserPreferences) => css`
  border-top-color: ${baseTheme?.accordion?.dividerColor};
`;

export function SubscriberPreference() {
  const { theme, common } = useNovuTheme();
  const { preferences: data, updatePreference, loading } = useSubscriberPreference();
  const baseTheme = theme?.userPreferences;
  const [loadingUpdate, setLoadingUpdate] = useState<boolean>(false);
  const preferences = data
    ?.filter((item) => !item.template.critical)
    ?.filter((pref) => Object.keys(pref.preference.channels).length > 0);
  const [
    rootStyles,
    itemDividerStyles,
    accordionItemStyles,
    accordionContentStyles,
    accordionControlStyles,
    accordionChevronStyles,
  ] = useStyles([
    'preferences.root',
    'preferences.item.divider',
    'accordion.item',
    'accordion.content',
    'accordion.control',
    'accordion.chevron',
  ]);
  const styles = accordionStyles(baseTheme, common.fontFamily);
  const accordionClassNames: Record<'item' | 'content' | 'control' | 'chevron', string> = {
    item: css(accordionItemStyles),
    content: css(accordionContentStyles),
    control: css(accordionControlStyles),
    chevron: css(accordionChevronStyles),
  };
  const showNoSettings = !loading && preferences?.length === 0;

  return showNoSettings ? (
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
      <div className={cx('nc-preferences-root', rootClassName, css(rootStyles))}>
        <Accordion chevronPosition="right" styles={styles} classNames={accordionClassNames}>
          {preferences?.map((item, index) => {
            const channelsKeys = Object.keys(item?.preference?.channels);
            const channelsPreference = item?.preference?.channels;

            const handleUpdateChannelPreference = async (type: string, checked: boolean) => {
              setLoadingUpdate(true);
              await updatePreference(item, type, checked);
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
                    <Divider
                      className={cx('nc-preferences-item-divider', dividerClassName(baseTheme), css(itemDividerStyles))}
                    />
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
  );
}

function WorkflowHeader({ label, channels, theme }) {
  const [itemTitleStyles, itemChannelsStyles] = useStyles(['preferences.item.title', 'preferences.item.channels']);

  return (
    <TextBlock>
      <Text
        size={'lg'}
        className={cx('nc-preferences-item-title', preferencesTitleClassName(theme), css(itemTitleStyles))}
      >
        {label}
      </Text>
      <Text
        data-test-id="workflow-active-channels"
        size={'sm'}
        className={cx('nc-preferences-item-channels', preferencesChannelsClassName(theme), css(itemChannelsStyles))}
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
