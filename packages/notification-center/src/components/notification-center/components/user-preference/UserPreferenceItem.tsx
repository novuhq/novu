import React from 'react';
import styled from '@emotion/styled';
import { css, cx } from '@emotion/css';
import { Accordion, Divider } from '@mantine/core';
import type { IUserPreferenceSettings } from '@novu/client';

import { IThemeUserPreferences } from '../../../../store/novu-theme.context';
import { useStyles } from '../../../../store/styles';
import { useNovuTheme, useUpdateUserPreferences } from '../../../../hooks';
import { WorkflowHeader } from './WorkflowHeader';
import { getChannel } from './channels';
import { ChannelPreference } from './ChannelPreference';

const dividerClassName = (baseTheme: IThemeUserPreferences) => css`
  border-top-color: ${baseTheme?.accordion?.dividerColor};
`;

const ChannelsWrapper = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0;
  gap: 20px;
`;

function getEnabledChannels(channels): string {
  const keys = Object.keys(channels);
  const list = keys.filter((key) => channels[key]).map((channel) => getChannel(channel).label);

  return list.join(', ');
}

export const UserPreferenceItem = ({ preferenceSettings }: { preferenceSettings?: IUserPreferenceSettings }) => {
  const { theme } = useNovuTheme();
  const { isLoading: isPreferenceUpdating, updateUserPreferences } = useUpdateUserPreferences();
  const [itemDividerStyles] = useStyles(['preferences.item.divider']);

  const baseTheme = theme?.userPreferences;
  const channelsKeys = Object.keys(preferenceSettings?.preference?.channels);
  const channelsPreference = preferenceSettings?.preference?.channels;

  const handleUpdateChannelPreference = (type: string, checked: boolean) => {
    updateUserPreferences({ templateId: preferenceSettings.template._id, channelType: type, checked });
  };

  return (
    <Accordion.Item value={preferenceSettings.template._id} data-test-id="workflow-list-item">
      <Accordion.Control>
        <WorkflowHeader
          theme={baseTheme}
          label={preferenceSettings.template?.name}
          channels={getEnabledChannels(channelsPreference)}
        />
      </Accordion.Control>
      <Accordion.Panel>
        <ChannelsWrapper>
          <Divider className={cx('nc-preferences-item-divider', dividerClassName(baseTheme), css(itemDividerStyles))} />
          {channelsKeys.map((key) => (
            <ChannelPreference
              key={key}
              type={key}
              active={channelsPreference[key]}
              disabled={isPreferenceUpdating}
              handleUpdateChannelPreference={handleUpdateChannelPreference}
            />
          ))}
        </ChannelsWrapper>
      </Accordion.Panel>
    </Accordion.Item>
  );
};
